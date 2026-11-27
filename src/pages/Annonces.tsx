import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Copy, Sparkles, RotateCcw, Check, Search } from 'lucide-react';
import { useStore, upsert } from '../lib/store';
import { PLATFORMS, PlatformId, norm, eur, todayISO } from '../lib/domain';
import { offlineListing, cleanListing, titleFor, api } from '../lib/listing';
import { Photo, initials, copyText, useToast, Empty, PlatformDots } from '../components/ui';

const TEXT_PLATFORMS = PLATFORMS.filter((p) => p.id !== 'vitrine');

export default function Annonces({ id }: { id?: string }) {
  const { items, settings } = useStore((s) => s);
  const [, navigate] = useLocation();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [plat, setPlat] = useState<PlatformId>('vinted');
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');
  const live = items.filter((i) => i.status !== 'vendu');
  const item = items.find((i) => i.id === id) || null;
  const key = item ? item.id + ':' + plat : '';
  const text = item ? texts[key] ?? offlineListing(item, plat, settings) : '';
  useEffect(() => setCopied(''), [key]);

  const list = useMemo(() => live.filter((i) => !q || norm([i.title, i.brand, i.ref, i.category].join(' ')).includes(norm(q))), [live, q]);
  const todo = live.filter((i) => TEXT_PLATFORMS.some((p) => !i.platforms[p.id]?.on));

  const improve = async () => {
    if (!item) return; setBusy(true);
    try {
      const r = await api<{ text: string }>('/api/ai?action=listing', { item, platform: plat, city: settings.city });
      setTexts((t) => ({ ...t, [key]: cleanListing(r.text) })); toast(`Texte retravaillé par ${settings.assistantName}.`);
    } catch (e: any) { toast(`${settings.assistantName} est indisponible : le modèle hors-ligne reste utilisable. (${e.message})`, 'warn'); }
    setBusy(false);
  };
  const copy = async (what: string, t: string) => { if (await copyText(t)) { setCopied(what); toast('Copié dans le presse-papiers.'); } };
  const markOnline = () => {
    if (!item) return;
    const cur = item.platforms[plat] || { on: false };
    upsert('items', { ...item, status: item.status === 'stock' || item.status === 'brouillon' ? 'en_ligne' : item.status, platforms: { ...item.platforms, [plat]: { ...cur, on: true, since: cur.since || todayISO(), price: cur.price || item.price } }, updatedAt: new Date().toISOString() });
    toast(`Marqué en ligne sur ${PLATFORMS.find((p) => p.id === plat)?.label}.`);
  };

  return (
    <div className="space-y-5">
      <div><p className="surtitre">Rédaction</p><h1 className="titre-page mt-2">Annonces prêtes à coller</h1>
        <p className="mt-2 max-w-2xl text-gris">Un texte adapté à chaque plateforme, avec ta phrase de fin sur les lots. Copie, colle dans l'appli, puis coche « en ligne ».</p></div>
      <div className="grid lg:grid-cols-[320px_1fr] gap-4 items-start">
        <aside className="carte p-3 lg:sticky lg:top-[76px]">
          <label className="relative block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gris" /><input className="champ !pl-9" placeholder="Chercher un article" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Chercher un article" /></label>
          <p className="px-1 mt-3 text-[12px] text-gris">{todo.length} article{todo.length > 1 ? 's' : ''} pas encore partout</p>
          <ul className="mt-2 max-h-[52vh] lg:max-h-[64vh] overflow-y-auto -mx-1">
            {list.map((i) => (
              <li key={i.id}>
                <button onClick={() => navigate('/annonces/' + i.id)} data-testid={`ad-pick-${i.id}`} className={`w-full flex items-center gap-3 rounded-md p-2 text-left ${i.id === id ? 'bg-or-clair/50' : 'hover:bg-encre/5'}`}>
                  <Photo id={i.photos[0]} alt="" className="h-11 w-11 rounded shrink-0" fallback={initials(i)} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-medium">{i.title}</span><span className="flex items-center gap-2 text-[12px] text-gris"><span className="num">{eur(i.price)}</span><PlatformDots item={i} /></span></span>
                </button>
              </li>
            ))}
            {!list.length && <li className="p-3 text-[13px] text-gris">Aucun article.</li>}
          </ul>
        </aside>

        {!item ? (
          <Empty title="Choisis un article" text="Sélectionne un article à gauche pour générer ses annonces Vinted, Leboncoin et Facebook." action={todo[0] && <button className="btn-encre" onClick={() => navigate('/annonces/' + todo[0].id)}>Commencer par {todo[0].title}</button>} />
        ) : (
          <section className="carte p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Photo id={item.photos[0]} alt={item.title} className="h-16 w-16 rounded" fallback={initials(item)} />
              <div className="flex-1 min-w-0"><p className="text-[12px] text-gris num">{item.ref}</p><h2 className="text-[18px] font-semibold truncate">{item.title}</h2><Link href={'/article/' + item.id} className="text-[13px] font-semibold text-or-fonce hover:underline">Modifier la fiche</Link></div>
              <p className="font-display text-[30px] num">{eur(item.platforms[plat]?.price || item.price)}</p>
            </div>
            <div role="tablist" aria-label="Plateforme" className="flex flex-wrap gap-1 rounded-md bg-encre/5 p-1">
              {TEXT_PLATFORMS.map((p) => (
                <button key={p.id} role="tab" aria-selected={plat === p.id} onClick={() => setPlat(p.id)} data-testid={`ad-tab-${p.id}`} className={`flex items-center gap-2 min-h-[38px] rounded px-3 text-[13px] font-semibold ${plat === p.id ? 'bg-papier shadow-carte' : 'text-gris hover:text-encre'}`}>
                  <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />{p.label}{item.platforms[p.id]?.on && <Check size={14} className="text-sauge" />}
                </button>
              ))}
            </div>
            {!item.condition && <p className="rounded-md bg-terre-clair p-3 text-[13px] text-terre">L'état n'est pas renseigné : ajoute-le dans la fiche pour une annonce honnête.</p>}
            <div>
              <div className="flex items-center justify-between"><span className="etiquette !mb-0">Titre</span><button className="btn-ligne btn-sm" onClick={() => copy('titre', titleFor(item))}>{copied === 'titre' ? <Check size={15} /> : <Copy size={15} />} Copier</button></div>
              <p className="mt-2 rounded-md border border-trait bg-white px-3 py-2.5 font-medium">{titleFor(item)}</p>
            </div>
            <div>
              <div className="flex items-center justify-between"><span className="etiquette !mb-0">Description</span><button className="btn-ligne btn-sm" onClick={() => copy('texte', text)} data-testid="ad-copy">{copied === 'texte' ? <Check size={15} /> : <Copy size={15} />} Copier</button></div>
              <textarea className="champ mt-2 min-h-[300px] font-sans leading-relaxed" value={text} onChange={(e) => setTexts((t) => ({ ...t, [key]: e.target.value }))} aria-label="Texte de l'annonce" data-testid="ad-text" />
              <p className="mt-1 text-[12px] text-gris num">{text.length} caractères</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-or" onClick={improve} disabled={busy} data-testid="ad-improve"><Sparkles size={16} /> {busy ? 'Rédaction…' : `Améliorer avec ${settings.assistantName}`}</button>
              {texts[key] !== undefined && <button className="btn-ligne" onClick={() => setTexts((t) => { const n = { ...t }; delete n[key]; return n; })}><RotateCcw size={15} /> Modèle de base</button>}
              {!item.platforms[plat]?.on ? <button className="btn-encre" onClick={markOnline} data-testid="ad-online">Marquer en ligne</button> : <span className="pastille bg-sauge-clair text-sauge self-center">Déjà en ligne</span>}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
