import { useEffect, useRef, useState } from 'react';
import { Download, Upload, RotateCcw, Trash2, Copy, KeyRound } from 'lucide-react';
import { useStore, updateSettings, replaceAll, resetDemo, clearAll, getState, State } from '../lib/store';
import { PLATFORMS, PlatformId, todayISO } from '../lib/domain';
import { Field, useConfirm, useToast, download, copyText } from '../components/ui';

function NumField({ label, value, onChange, step = 1, hint, suffix }: { label: string; value: number; onChange: (n: number) => void; step?: number; hint?: string; suffix?: string }) {
  return <Field label={label + (suffix ? ` (${suffix})` : '')} hint={hint}><input className="champ num" type="number" step={step} min="0" value={value} onChange={(e) => onChange(+e.target.value)} /></Field>;
}

export default function Reglages() {
  const s = useStore((x) => x.settings);
  const counts = { i: useStore((x) => x.items.length), v: useStore((x) => x.sales.length) };
  const confirm = useConfirm(); const toast = useToast();
  const [ai, setAi] = useState<{ ok: boolean; provider?: string; model?: string } | null>(null);
  const [key, setKey] = useState('');
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { fetch('/api/ai').then((r) => (r.ok ? r.json() : { ok: false })).then(setAi).catch(() => setAi({ ok: false })); }, []);
  const setFee = (p: PlatformId, k: 'pct' | 'fixed', v: number) => updateSettings({ fees: { ...s.fees, [p]: { ...s.fees[p], [k]: v } } });

  const exportJson = () => { download(`mimo-sauvegarde-${todayISO()}.json`, JSON.stringify({ app: 'mimo-store-azmira', version: 1, exportedAt: new Date().toISOString(), data: getState() }), 'application/json'); toast('Sauvegarde téléchargée (sans les photos importées).'); };
  const importJson = async (f?: File) => {
    if (!f) return;
    try {
      const j = JSON.parse(await f.text()); const d: State = j.data || j;
      if (!Array.isArray(d.items) || !Array.isArray(d.sales)) throw new Error();
      if (!(await confirm({ title: 'Remplacer les données ?', message: `La sauvegarde contient ${d.items.length} articles et ${d.sales.length} ventes. Les données actuelles seront remplacées.`, confirm: 'Remplacer' }))) return;
      await replaceAll({ items: d.items, sales: d.sales, clients: d.clients || [], expenses: d.expenses || [], settings: { ...s, ...d.settings }, seeded: true });
      toast('Sauvegarde restaurée.');
    } catch { toast('Fichier de sauvegarde illisible.', 'warn'); }
    if (file.current) file.current.value = '';
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div><p className="surtitre">Configuration</p><h1 className="titre-page mt-2">Réglages</h1></div>
      <section className="carte p-5 space-y-3">
        <h2 className="text-[16px] font-semibold">Boutique</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Nom de la boutique"><input className="champ" value={s.shopName} onChange={(e) => updateSettings({ shopName: e.target.value })} data-testid="set-name" /></Field>
          <Field label="Nom de l'assistante"><input className="champ" value={s.assistantName} onChange={(e) => updateSettings({ assistantName: e.target.value || 'Mira' })} /></Field>
          <Field label="Ville"><input className="champ" value={s.city} onChange={(e) => updateSettings({ city: e.target.value })} /></Field>
          <Field label="Code postal"><input className="champ num" value={s.postal} onChange={(e) => updateSettings({ postal: e.target.value })} inputMode="numeric" /></Field>
          <Field label="WhatsApp (commandes)" hint="Format 06… ou +33…"><input className="champ num" type="tel" value={s.whatsapp} onChange={(e) => updateSettings({ whatsapp: e.target.value })} /></Field>
          <Field label="E-mail (commandes)"><input className="champ" type="email" value={s.email} onChange={(e) => updateSettings({ email: e.target.value })} /></Field>
        </div>
        <Field label="Phrase d'accroche de la vitrine"><input className="champ" value={s.tagline} onChange={(e) => updateSettings({ tagline: e.target.value })} /></Field>
        <div className="flex flex-wrap gap-5 text-[14px]">
          <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-[#1B1A17]" checked={s.handover} onChange={(e) => updateSettings({ handover: e.target.checked })} /> Remise en main propre</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-[#1B1A17]" checked={s.shipping} onChange={(e) => updateSettings({ shipping: e.target.checked })} /> Envoi en France</label>
        </div>
      </section>
      <section className="carte p-5">
        <h2 className="text-[16px] font-semibold">Frais vendeur par plateforme</h2>
        <p className="text-[13px] text-gris mt-1">Retenus sur chaque vente pour calculer le net. Vinted et Leboncoin ne prennent en général rien au vendeur particulier (frais payés par l'acheteur).</p>
        <ul className="mt-3 space-y-2">{PLATFORMS.map((p) => <li key={p.id} className="grid grid-cols-[1fr_110px_110px] items-center gap-2"><span className="flex items-center gap-2 text-[14px]"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />{p.label}</span>
          <input className="champ num" type="number" step="0.1" min="0" aria-label={`Commission ${p.label} en %`} value={s.fees[p.id].pct} onChange={(e) => setFee(p.id, 'pct', +e.target.value)} placeholder="%" />
          <input className="champ num" type="number" step="0.1" min="0" aria-label={`Frais fixe ${p.label} en euros`} value={s.fees[p.id].fixed} onChange={(e) => setFee(p.id, 'fixed', +e.target.value)} placeholder="€" /></li>)}</ul>
        <p className="mt-1 text-[12px] text-gris text-right">% · € fixe</p>
      </section>
      <section className="carte p-5">
        <h2 className="text-[16px] font-semibold">Règles de gestion</h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <NumField label="Délai d'envoi" suffix="jours ouvrés" value={s.shipDays} onChange={(n) => updateSettings({ shipDays: Math.max(1, n) })} />
          <NumField label="Article qui traîne après" suffix="jours" value={s.staleDays} onChange={(n) => updateSettings({ staleDays: Math.max(1, n) })} />
          <NumField label="Baisse suggérée" suffix="%" value={s.markdownPct} onChange={(n) => updateSettings({ markdownPct: n })} />
          <NumField label="Arrondi des prix" suffix="€" value={s.roundTo} onChange={(n) => updateSettings({ roundTo: Math.max(0.5, n) })} step={0.5} />
          <NumField label="Marge minimale" suffix="%" value={s.minMarginPct} onChange={(n) => updateSettings({ minMarginPct: Math.min(90, n) })} />
        </div>
      </section>
      <section className="carte p-5">
        <h2 className="text-[16px] font-semibold">Micro-entreprise</h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <NumField label="Taux URSSAF" suffix="%" step={0.1} value={s.urssafRate} onChange={(n) => updateSettings({ urssafRate: n })} />
          <NumField label="Versement libératoire" suffix="%" step={0.1} value={s.vlRate} onChange={(n) => updateSettings({ vlRate: n })} />
          <NumField label="Seuil de CA" suffix="€" step={100} value={s.caThreshold} onChange={(n) => updateSettings({ caThreshold: n })} />
        </div>
        <label className="mt-3 flex items-center gap-2 text-[14px]"><input type="checkbox" className="h-5 w-5 accent-[#1B1A17]" checked={s.vl} onChange={(e) => updateSettings({ vl: e.target.checked })} /> Versement libératoire activé</label>
      </section>
      <section className="carte p-5 space-y-3">
        <h2 className="text-[16px] font-semibold">Assistante IA et vitrine</h2>
        <p className="text-[14px]">{s.assistantName} : {!ai ? 'vérification…' : ai.ok ? <span className="text-sauge font-semibold">connectée ({ai.provider} · {ai.model})</span> : <span className="text-or-fonce font-semibold">non configurée — les textes et estimations hors-ligne restent disponibles</span>}</p>
        <div>
          <span className="etiquette flex items-center gap-1.5"><KeyRound size={14} /> Clé de boutique</span>
          <p className="text-[13px] text-gris">Protège la publication de ta vitrine. Recopie-la sur ton autre appareil pour publier depuis les deux.</p>
          <div className="mt-2 flex flex-wrap gap-2"><code className="rounded bg-creme px-2 py-2 text-[12px] break-all flex-1 min-w-[200px]">{s.shopKey}</code><button className="btn-ligne btn-sm" onClick={async () => (await copyText(s.shopKey)) && toast('Clé copiée.')}><Copy size={14} /> Copier</button></div>
          <div className="mt-2 flex gap-2"><input className="champ" placeholder="Coller une clé existante" value={key} onChange={(e) => setKey(e.target.value.trim())} aria-label="Coller une clé de boutique" /><button className="btn-doux btn-sm" disabled={!/^[a-f0-9]{48}$/.test(key)} onClick={() => { updateSettings({ shopKey: key }); setKey(''); toast('Clé restaurée.'); }}>Utiliser</button></div>
        </div>
      </section>
      <section className="carte p-5">
        <h2 className="text-[16px] font-semibold">Données</h2>
        <p className="text-[13px] text-gris mt-1">{counts.i} articles et {counts.v} ventes enregistrés sur cet appareil (navigateur). Exporte régulièrement une sauvegarde.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-encre" onClick={exportJson} data-testid="export"><Download size={16} /> Exporter</button>
          <button className="btn-ligne" onClick={() => file.current?.click()}><Upload size={16} /> Importer</button>
          <input ref={file} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => importJson(e.target.files?.[0])} aria-label="Fichier de sauvegarde" />
          <button className="btn-ligne" onClick={async () => { if (await confirm({ title: 'Recharger la démo ?', message: 'Les données actuelles seront remplacées par les données de démonstration.', confirm: 'Recharger' })) { await resetDemo(); toast('Démo rechargée.'); } }} data-testid="reset-demo"><RotateCcw size={16} /> Données de démo</button>
          <button className="btn-danger" onClick={async () => { if (await confirm({ title: 'Tout effacer ?', message: 'Articles, ventes, clients et dépenses seront supprimés de cet appareil. Pense à exporter avant.', confirm: 'Tout effacer', danger: true })) { await clearAll(); toast('Données effacées.'); } }} data-testid="clear-all"><Trash2 size={16} /> Tout effacer</button>
        </div>
      </section>
    </div>
  );
}
