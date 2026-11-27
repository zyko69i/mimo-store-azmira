import { useEffect, useRef, useState } from 'react';
import { useLocation, Link } from 'wouter';
import QRCode from 'qrcode';
import { Camera, RotateCcw, RotateCw, Trash2, Star, Sparkles, Copy, PenLine, QrCode, ArrowLeft } from 'lucide-react';
import { useStore, upsert, remove, getState, savePhoto, fileToJpeg, rotateDataUrl, loadPhoto, deletePhoto } from '../lib/store';
import { blankItem, CATEGORY_GROUPS, CONDITIONS, PLATFORMS, Item, eur, eur2, offlinePriceHint, todayISO, uid, nextRef, STATUS_LABEL, ItemStatus, fdate, PlatformId } from '../lib/domain';
import { api } from '../lib/listing';
import { Field, Photo, initials, useConfirm, useToast, Modal } from '../components/ui';
import SellModal from '../components/SellModal';

const SLOTS = ['Devant', 'Dos', 'Étiquette', 'Détail', 'Défaut', 'Autre'];

export default function ItemEditor({ id }: { id: string }) {
  const [, navigate] = useLocation();
  const settings = useStore((s) => s.settings);
  const stored = useStore((s) => s.items.find((i) => i.id === id));
  const isNew = id === 'nouveau';
  const [it, setIt] = useState<Item | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [est, setEst] = useState<{ price: number; low: number; high: number; reason: string } | null>(null);
  const [selling, setSelling] = useState(false);
  const [qr, setQr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirm(); const toast = useToast();

  useEffect(() => {
    if (isNew) setIt(blankItem(getState().items, settings));
    else if (stored) setIt(structuredClone(stored));
  }, [id, stored?.updatedAt, stored?.status]);

  if (!it) return <div className="carte p-10 text-center"><p className="font-display text-[26px]">Article introuvable</p><Link href="/stock" className="btn-encre mt-4">Retour au stock</Link></div>;
  const set = <K extends keyof Item>(k: K, v: Item[K]) => { setIt((x) => (x ? { ...x, [k]: v } : x)); setDirty(true); };
  const setPlat = (p: PlatformId, patch: any) => {
    const cur = it.platforms[p] || { on: false };
    const next = { ...cur, ...patch }; if (patch.on && !cur.on) { next.since = todayISO(); next.price = next.price || it.price; }
    set('platforms', { ...it.platforms, [p]: next });
  };
  const hint = offlinePriceHint(it, settings);
  const margin = it.price - it.buyPrice; const marginPct = it.price ? (margin / it.price) * 100 : 0;

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy('photo');
    try {
      const ids: string[] = [];
      for (const f of Array.from(files).slice(0, 6 - it.photos.length)) ids.push(await savePhoto(await fileToJpeg(f)));
      set('photos', [...it.photos, ...ids]);
    } catch { toast('Cette photo n’a pas pu être lue.', 'warn'); }
    setBusy(''); if (fileRef.current) fileRef.current.value = '';
  };
  const rotate = async (idx: number, dir: 1 | -1) => {
    const src = await loadPhoto(it.photos[idx]); if (!src) return;
    const nid = await savePhoto(await rotateDataUrl(src, dir));
    const photos = [...it.photos]; photos[idx] = nid; set('photos', photos);
  };
  const dropPhoto = (idx: number) => set('photos', it.photos.filter((_, i) => i !== idx));
  const makeMain = (idx: number) => set('photos', [it.photos[idx], ...it.photos.filter((_, i) => i !== idx)]);

  const save = (go = true) => {
    if (!it.title.trim()) { toast('Donne un nom à l’article.', 'warn'); return false; }
    const prev = getState().items.find((x) => x.id === it.id);
    let history = it.priceHistory;
    if (!prev || prev.price !== it.price) history = [...history, { date: todayISO(), price: it.price }];
    const anyOn = PLATFORMS.some((p) => it.platforms[p.id]?.on);
    let status: ItemStatus = it.status;
    if (status !== 'vendu' && status !== 'reserve' && status !== 'brouillon') status = anyOn ? 'en_ligne' : 'stock';
    // photos supprimées : nettoyage
    prev?.photos.filter((p) => !it.photos.includes(p)).forEach((p) => deletePhoto(p));
    const row = { ...it, status, priceHistory: history, title: it.title.trim(), updatedAt: new Date().toISOString() };
    upsert('items', row); setDirty(false);
    toast(prev ? 'Fiche enregistrée.' : `Article ${row.ref} ajouté au stock.`);
    if (go) navigate(isNew ? '/article/' + row.id : '/stock');
    return true;
  };
  const del = async () => {
    if (!(await confirm({ title: 'Supprimer cet article ?', message: `${it.ref} · ${it.title} sera retiré du stock. Les ventes déjà enregistrées restent dans la comptabilité.`, confirm: 'Supprimer', danger: true }))) return;
    it.photos.forEach((p) => deletePhoto(p)); remove('items', it.id); toast('Article supprimé.'); navigate('/stock');
  };
  const duplicate = () => {
    const items = getState().items; const copy: Item = { ...structuredClone(it), id: uid(), ref: nextRef(items), photos: [], status: 'stock', platforms: {}, priceHistory: [], views: 0, favorites: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    upsert('items', copy); toast(`Copie créée : ${copy.ref} (sans photos).`); navigate('/article/' + copy.id);
  };
  const estimate = async () => {
    setBusy('price'); setEst(null);
    try { setEst(await api('/api/ai?action=price', { item: it })); }
    catch (e: any) { if (hint) setEst({ ...hint, reason: `${settings.assistantName} n'est pas connectée : repère calculé sur l'appareil (prix d'achat × état, marge minimale de ${settings.minMarginPct} % respectée).` }); else toast(e.message, 'warn'); }
    setBusy('');
  };
  const showQr = async () => setQr(await QRCode.toDataURL(`${it.ref} | ${it.title} | ${it.size || ''} | ${eur(it.price)}`, { margin: 1, width: 360, color: { dark: '#1B1A17', light: '#FFFFFF' } }));

  return (
    <div className="space-y-5 pb-20">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <button onClick={() => navigate('/stock')} className="text-[13px] font-semibold text-gris hover:text-encre flex items-center gap-1 mb-2"><ArrowLeft size={14} /> Stock</button>
          <p className="surtitre num">{it.ref}{!isNew && ' · ' + STATUS_LABEL[it.status]}</p>
          <h1 className="titre-page mt-2">{isNew ? 'Nouvel article' : it.title || 'Sans titre'}</h1>
        </div>
        {!isNew && (
          <div className="flex flex-wrap gap-2">
            <button className="btn-ligne btn-sm" onClick={() => { if (dirty) save(false); navigate('/annonces/' + it.id); }} data-testid="item-ads"><PenLine size={15} /> Annonces</button>
            {it.status !== 'vendu' && <button className="btn-ligne btn-sm" onClick={() => { if (!dirty || save(false)) setSelling(true); }} data-testid="item-sell">Vendu</button>}
            <button className="btn-ligne btn-sm" onClick={showQr} aria-label="Étiquette QR"><QrCode size={15} /> Étiquette</button>
            <button className="btn-ligne btn-sm" onClick={duplicate}><Copy size={15} /> Dupliquer</button>
            <button className="btn-danger btn-sm" onClick={del} data-testid="item-delete"><Trash2 size={15} /> Supprimer</button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-4 items-start">
        <div className="space-y-4">
          <section className="carte p-5">
            <div className="flex items-center justify-between"><h2 className="text-[16px] font-semibold">Photos</h2><span className="text-[13px] text-gris num">{it.photos.length} / 6</span></div>
            <p className="text-[13px] text-gris mt-1">Photos gardées telles quelles (orientation corrigée). La première sert de couverture.</p>
            <ul className="mt-4 grid grid-cols-3 gap-2">
              {it.photos.map((p, idx) => (
                <li key={p} className="relative">
                  <Photo id={p} alt={`Photo ${idx + 1}`} className="aspect-square w-full rounded" />
                  <span className="absolute left-1 top-1 pastille bg-papier/90 text-encre">{idx === 0 ? 'Couverture' : SLOTS[idx] || 'Photo'}</span>
                  <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
                    <button className="h-9 w-9 grid place-items-center rounded bg-papier/95 shadow" aria-label="Tourner à gauche" onClick={() => rotate(idx, -1)}><RotateCcw size={16} /></button>
                    {idx > 0 && <button className="h-9 w-9 grid place-items-center rounded bg-papier/95 shadow" aria-label="Mettre en couverture" onClick={() => makeMain(idx)}><Star size={16} /></button>}
                    <button className="h-9 w-9 grid place-items-center rounded bg-papier/95 shadow" aria-label="Tourner à droite" onClick={() => rotate(idx, 1)}><RotateCw size={16} /></button>
                    <button className="h-9 w-9 grid place-items-center rounded bg-papier/95 shadow text-terre" aria-label="Retirer la photo" onClick={() => dropPhoto(idx)}><Trash2 size={16} /></button>
                  </div>
                </li>
              ))}
              {it.photos.length < 6 && (
                <li>
                  <button className="aspect-square w-full rounded border border-dashed border-or/60 bg-or-clair/25 text-or-fonce flex flex-col items-center justify-center gap-1.5 text-[13px] font-semibold hover:bg-or-clair/50" onClick={() => fileRef.current?.click()} disabled={busy === 'photo'} data-testid="add-photo">
                    <Camera size={22} strokeWidth={1.6} />{busy === 'photo' ? 'Lecture…' : SLOTS[it.photos.length]}
                  </button>
                </li>
              )}
            </ul>
            <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addPhotos(e.target.files)} data-testid="photo-input" aria-label="Ajouter des photos" />
          </section>

          <section className="carte p-5 space-y-3">
            <h2 className="text-[16px] font-semibold">Description</h2>
            <Field label="Nom de l'article"><input className="champ" value={it.title} onChange={(e) => set('title', e.target.value)} placeholder="Ex. Veste en jean Trucker" data-testid="item-title" maxLength={90} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Marque"><input className="champ" value={it.brand} onChange={(e) => set('brand', e.target.value)} data-testid="item-brand" /></Field>
              <Field label="Taille"><input className="champ" value={it.size} onChange={(e) => set('size', e.target.value)} placeholder="M, 42, 8 ans…" /></Field>
              <Field label="Catégorie">
                <select className="champ" value={it.category} onChange={(e) => set('category', e.target.value)} data-testid="item-category">
                  <option value="">Choisir…</option>{CATEGORY_GROUPS.map((g) => <optgroup key={g.group} label={g.group}>{g.items.map((c) => <option key={c}>{c}</option>)}</optgroup>)}
                </select>
              </Field>
              <Field label="État">
                <select className="champ" value={it.condition} onChange={(e) => set('condition', e.target.value)} data-testid="item-condition">
                  <option value="">Choisir l'état…</option>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Couleur"><input className="champ" value={it.color} onChange={(e) => set('color', e.target.value)} /></Field>
              <Field label="Matière"><input className="champ" value={it.material} onChange={(e) => set('material', e.target.value)} /></Field>
            </div>
            <Field label="Détails vérifiés" hint="Seulement ce qui est vrai et visible : défauts, accessoires fournis, mesures."><textarea className="champ min-h-[84px]" value={it.details} onChange={(e) => set('details', e.target.value)} /></Field>
          </section>
        </div>

        <div className="space-y-4">
          <section className="carte p-5 space-y-3">
            <h2 className="text-[16px] font-semibold">Prix et marge</h2>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Achat (€)"><input className="champ num" type="number" inputMode="decimal" min="0" step="0.5" value={it.buyPrice || ''} onChange={(e) => set('buyPrice', +e.target.value)} data-testid="item-buy" /></Field>
              <Field label="Prix affiché (€)"><input className="champ num" type="number" inputMode="decimal" min="0" step="0.5" value={it.price || ''} onChange={(e) => set('price', +e.target.value)} data-testid="item-price" /></Field>
              <Field label="Plancher (€)"><input className="champ num" type="number" inputMode="decimal" min="0" step="0.5" value={it.floorPrice || ''} onChange={(e) => set('floorPrice', +e.target.value)} /></Field>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px]">
              <span>Marge : <strong className={`num ${margin < 0 ? 'text-terre' : marginPct < settings.minMarginPct ? 'text-or-fonce' : 'text-sauge'}`}>{eur2(margin)} ({Math.round(marginPct)} %)</strong></span>
              {hint && <span className="text-gris">Repère : <span className="num">{eur(hint.low)} – {eur(hint.high)}</span></span>}
            </div>
            {it.price > 0 && it.price < it.buyPrice && <p className="text-[13px] text-terre">Prix inférieur au prix d'achat.</p>}
            {it.price > 0 && it.price >= it.buyPrice && marginPct < settings.minMarginPct && <p className="text-[13px] text-or-fonce">Sous ta marge minimale de {settings.minMarginPct} %.</p>}
            <div className="flex flex-wrap gap-2">
              <button className="btn-doux btn-sm" onClick={estimate} disabled={busy === 'price'} data-testid="estimate"><Sparkles size={15} /> {busy === 'price' ? 'Estimation…' : `Estimer avec ${settings.assistantName}`}</button>
              {hint && !it.price && <button className="btn-ligne btn-sm num" onClick={() => set('price', hint.price)}>Utiliser {eur(hint.price)}</button>}
            </div>
            {est && (
              <div className="rounded-md bg-creme p-3 text-[14px]" data-testid="estimate-result">
                <p><strong className="num">{eur(est.price)}</strong> <span className="text-gris num">({eur(est.low)} – {eur(est.high)})</span></p>
                <p className="text-gris mt-1">{est.reason}</p>
                <button className="btn-ligne btn-sm mt-2" onClick={() => { set('price', est.price); setEst(null); }}>Appliquer ce prix</button>
              </div>
            )}
            {it.priceHistory.length > 1 && <p className="text-[13px] text-gris">Historique : {it.priceHistory.map((h) => `${fdate(h.date)} ${eur(h.price)}`).join(' → ')}</p>}
          </section>

          <section className="carte p-5">
            <h2 className="text-[16px] font-semibold">Où c'est en ligne</h2>
            <p className="text-[13px] text-gris mt-1">Rien n'est publié automatiquement : coche quand l'annonce est en ligne, colle le lien si tu l'as.</p>
            <ul className="mt-3 space-y-2">
              {PLATFORMS.map((p) => {
                const l = it.platforms[p.id] || { on: false };
                return (
                  <li key={p.id} className={`rounded-md border p-3 ${l.on ? 'border-transparent bg-white shadow-carte' : 'border-trait'}`}>
                    <label className="flex items-center gap-3 min-h-[36px]">
                      <input type="checkbox" className="h-5 w-5 accent-[#1B1A17]" checked={!!l.on} onChange={(e) => setPlat(p.id, { on: e.target.checked })} data-testid={`plat-${p.id}`} />
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
                      <span className="flex-1 font-medium">{p.label}</span>
                      {l.on && l.since && <span className="text-[12px] text-gris num">depuis le {fdate(l.since)}</span>}
                    </label>
                    {l.on && p.id !== 'vitrine' && (
                      <div className="grid grid-cols-[110px_1fr] gap-2 mt-2">
                        <input className="champ num" type="number" aria-label={`Prix sur ${p.label}`} value={l.price || ''} onChange={(e) => setPlat(p.id, { price: +e.target.value })} placeholder="Prix" />
                        <input className="champ" type="url" aria-label={`Lien ${p.label}`} value={l.url || ''} onChange={(e) => setPlat(p.id, { url: e.target.value })} placeholder="Lien de l'annonce" />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="carte p-5 space-y-3">
            <h2 className="text-[16px] font-semibold">Logistique</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Emplacement"><input className="champ" value={it.location} onChange={(e) => set('location', e.target.value)} placeholder="Étagère A1" /></Field>
              <Field label="Poids du colis"><select className="champ" value={it.weight} onChange={(e) => set('weight', e.target.value)}><option value="">—</option>{['< 250 g', '250 – 500 g', '500 g – 1 kg', '1 – 2 kg', '2 – 5 kg', '> 5 kg'].map((w) => <option key={w}>{w}</option>)}</select></Field>
              <Field label="Date d'achat"><input className="champ" type="date" value={it.buyDate} onChange={(e) => set('buyDate', e.target.value)} /></Field>
              <Field label="Code / SKU"><input className="champ" value={it.sku} onChange={(e) => set('sku', e.target.value)} /></Field>
              <Field label="Statut" className="col-span-2">
                <select className="champ" value={it.status} onChange={(e) => set('status', e.target.value as ItemStatus)}>
                  {(['brouillon', 'stock', 'en_ligne', 'reserve', 'vendu'] as ItemStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </Field>
            </div>
          </section>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 lg:left-[248px] z-20 border-t border-trait bg-papier/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <p className="text-[13px] text-gris">{dirty ? 'Modifications non enregistrées' : isNew ? 'Nouvelle fiche' : 'À jour'}</p>
          <div className="flex gap-2"><button className="btn-ligne" onClick={() => navigate('/stock')}>Annuler</button><button className="btn-encre" onClick={() => save()} data-testid="item-save">Enregistrer</button></div>
        </div>
      </div>
      {selling && <SellModal item={getState().items.find((x) => x.id === it.id) || it} onClose={() => setSelling(false)} />}
      <Modal open={!!qr} onClose={() => setQr('')} title="Étiquette de stock" footer={<button className="btn-encre" onClick={() => window.print()}>Imprimer</button>}>
        <div className="flex items-center gap-4"><img src={qr} alt={`QR code ${it.ref}`} className="h-40 w-40" /><div><p className="font-display text-[28px] leading-none num">{it.ref}</p><p className="mt-2 font-medium">{it.title}</p><p className="text-gris">{[it.brand, it.size].filter(Boolean).join(' · ')}</p><p className="mt-2 text-[18px] font-semibold num">{eur(it.price)}</p>{it.location && <p className="text-[13px] text-gris">{it.location}</p>}</div></div>
      </Modal>
    </div>
  );
}
