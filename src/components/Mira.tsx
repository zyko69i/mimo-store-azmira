import { useEffect, useRef, useState } from 'react';
import { X, Send, Sparkles } from 'lucide-react';
import { getState, useStore } from '../lib/store';
import { eur, saleProfit, shipDeadline, staleInfo, todayISO, fdate, listedPlatforms } from '../lib/domain';

type Msg = { role: 'user' | 'assistant'; content: string };

function summary() {
  const { items, sales, expenses, settings } = getState(); const today = todayISO(); const m = today.slice(0, 7);
  const live = items.filter((i) => i.status !== 'vendu');
  const ms = sales.filter((x) => x.date.startsWith(m));
  const toShip = sales.filter((x) => x.status === 'a_envoyer').map((x) => ({ t: x.itemTitle, dl: shipDeadline(settings, x) }));
  const stale = live.map((i) => ({ i, s: staleInfo(i, settings, today) })).filter((x) => x.s?.stale);
  const unlisted = live.filter((i) => !listedPlatforms(i).length);
  return {
    today, shop: settings.shopName, city: settings.city,
    month: { ventes: ms.length, ca: ms.reduce((a, x) => a + x.price, 0), benefice: ms.reduce((a, x) => a + saleProfit(x), 0) - expenses.filter((e) => e.date.startsWith(m) && e.category !== 'Achat de stock').reduce((a, e) => a + e.amount, 0) },
    stock: { articles: live.length, valeur: live.reduce((a, i) => a + i.price, 0), cout: live.reduce((a, i) => a + i.buyPrice, 0) },
    toShip, stale: stale.map((x) => ({ t: x.i.title, prix: x.i.price, jours: x.s!.days, suggere: x.s!.suggested })), unlisted: unlisted.map((i) => i.title),
  };
}

function localAnswer(q: string) {
  const s = summary(); const t = q.toLowerCase();
  if (/envo|colis|expé/.test(t)) return s.toShip.length ? `${s.toShip.length} colis à envoyer :\n` + s.toShip.sort((a, b) => a.dl.localeCompare(b.dl)).map((x) => `- ${x.t} — avant le ${fdate(x.dl, { weekday: 'long', day: 'numeric', month: 'long' })}${x.dl < s.today ? ' (EN RETARD)' : ''}`).join('\n') : 'Aucun colis à envoyer. Tout est à jour.';
  if (/traîn|train|baiss|vend pas|stagn/.test(t)) return s.stale.length ? 'Articles qui traînent :\n' + s.stale.map((x) => `- ${x.t} : en ligne depuis ${x.jours} j, ${eur(x.prix)} → proposer ${eur(x.suggere)}`).join('\n') : "Aucun article ne traîne pour l'instant.";
  if (/publi|annonce|en ligne/.test(t)) return s.unlisted.length ? `${s.unlisted.length} article(s) pas encore en ligne :\n- ` + s.unlisted.join('\n- ') + '\nOuvre « Annonces » pour générer les textes.' : 'Tous tes articles sont en ligne sur au moins une plateforme.';
  return `Bilan du mois : ${s.month.ventes} ventes, ${eur(s.month.ca)} de CA, ${eur(s.month.benefice)} de bénéfice estimé.\nStock : ${s.stock.articles} articles, ${eur(s.stock.valeur)} en prix affiché (coût ${eur(s.stock.cout)}).\n${s.toShip.length} colis à envoyer, ${s.stale.length} article(s) qui traînent.`;
}

const SUGGEST = ['Fais-moi le bilan du mois', 'Quels colis dois-je envoyer ?', 'Quels articles traînent ?', 'Que reste-t-il à publier ?'];

export default function Mira({ open, onClose }: { open: boolean; onClose: () => void }) {
  const name = useStore((s) => s.settings.assistantName);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const end = useRef<HTMLDivElement>(null); const inp = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs, busy]);
  useEffect(() => { if (open) setTimeout(() => inp.current?.focus(), 50); const k = (e: KeyboardEvent) => open && e.key === 'Escape' && onClose(); document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [open]);

  const send = async (text = input) => {
    const q = text.trim(); if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: 'user', content: q }]; setMsgs(next); setInput('');
    if (offline) { setMsgs([...next, { role: 'assistant', content: localAnswer(q) }]); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/ai?action=chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next, context: JSON.stringify(summary()) }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { if (r.status === 503 || r.status === 404 || r.status >= 500) setOffline(true); setMsgs([...next, { role: 'assistant', content: localAnswer(q) + (r.status === 429 ? '\n\n(Trop de demandes, réponse calculée sur l’appareil.)' : '') }]); }
      else setMsgs([...next, { role: 'assistant', content: d.text }]);
    } catch { setOffline(true); setMsgs([...next, { role: 'assistant', content: localAnswer(q) }]); }
    setBusy(false);
  };

  if (!open) return null;
  return (
    <aside role="dialog" aria-label={`Assistante ${name}`} className="fixed z-40 inset-x-0 bottom-0 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[400px] h-[78vh] sm:h-[600px] flex flex-col bg-papier rounded-t-lg sm:rounded-lg shadow-flot border border-trait" data-testid="mira">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-trait">
        <span className="h-9 w-9 rounded-full bg-encre grid place-items-center"><Sparkles size={16} className="text-or-clair" /></span>
        <div className="flex-1"><p className="font-display text-[22px] leading-none">{name}</p><p className="text-[12px] text-gris">{offline ? 'Mode hors-ligne : réponses calculées sur tes données' : 'Assistante de la boutique'}</p></div>
        <button className="btn-ligne btn-sm !px-2" onClick={onClose} aria-label="Fermer l'assistante"><X size={18} /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {!msgs.length && <div><p className="text-[14px] text-gris">Bonjour, je suis {name}. Je connais ton stock, tes ventes et tes envois. Que veux-tu savoir ?</p>
          <div className="mt-3 flex flex-col gap-2">{SUGGEST.map((s) => <button key={s} className="btn-doux btn-sm justify-start" onClick={() => send(s)}>{s}</button>)}</div></div>}
        {msgs.map((m, i) => <div key={i} className={`max-w-[88%] whitespace-pre-line rounded-lg px-3.5 py-2.5 text-[14px] leading-relaxed ${m.role === 'user' ? 'ml-auto bg-encre text-creme' : 'bg-creme'}`}>{m.content}</div>)}
        {busy && <div className="bg-creme rounded-lg px-3.5 py-2.5 text-[14px] text-gris w-fit">{name} réfléchit…</div>}
        <div ref={end} />
      </div>
      <form className="flex items-end gap-2 border-t border-trait p-3 pb-[max(12px,env(safe-area-inset-bottom))]" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <textarea ref={inp} rows={1} className="champ resize-none max-h-32" placeholder={`Écrire à ${name}…`} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} aria-label="Message" data-testid="mira-input" />
        <button className="btn-encre !px-3" disabled={!input.trim() || busy} aria-label="Envoyer" data-testid="mira-send"><Send size={17} /></button>
      </form>
    </aside>
  );
}
