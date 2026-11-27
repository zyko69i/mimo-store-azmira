import { useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Search, Plus, LayoutGrid, List } from 'lucide-react';
import { useStore } from '../lib/store';
import { CATEGORY_GROUPS, ItemStatus, PLATFORMS, eur, itemMarginPct, norm, staleInfo, todayISO, Item, onlineSince, daysBetween } from '../lib/domain';
import { Photo, initials, PlatformDots, StatusBadge, Empty, Segmented } from '../components/ui';
import SellModal from '../components/SellModal';

type F = 'tous' | 'stock' | 'en_ligne' | 'vendu' | 'brouillon';
export default function Stock() {
  const { items, settings } = useStore((s) => s);
  const [, navigate] = useLocation();
  const [q, setQ] = useState('');
  const [f, setF] = useState<F>('tous');
  const [plat, setPlat] = useState('');
  const [cat, setCat] = useState('');
  const [sort, setSort] = useState('recent');
  const [view, setView] = useState<'grille' | 'liste'>('grille');
  const [selling, setSelling] = useState<Item | null>(null);
  const today = todayISO();

  const count = (s: F) => items.filter((i) => (s === 'tous' ? i.status !== 'vendu' : s === 'stock' ? i.status === 'stock' || i.status === 'reserve' : i.status === s)).length;
  const list = useMemo(() => {
    const n = norm(q);
    let r = items.filter((i) => (f === 'tous' ? i.status !== 'vendu' : f === 'stock' ? i.status === 'stock' || i.status === 'reserve' : i.status === f));
    if (plat) r = r.filter((i) => plat === 'aucune' ? !PLATFORMS.some((p) => i.platforms?.[p.id]?.on) : i.platforms?.[plat as 'vinted']?.on);
    if (cat) r = r.filter((i) => i.category === cat);
    if (n) r = r.filter((i) => norm([i.ref, i.title, i.brand, i.category, i.size, i.color, i.location, i.sku].join(' ')).includes(n));
    const by: Record<string, (a: Item, b: Item) => number> = {
      recent: (a, b) => b.createdAt.localeCompare(a.createdAt) || b.ref.localeCompare(a.ref),
      prix: (a, b) => b.price - a.price,
      marge: (a, b) => itemMarginPct(b) - itemMarginPct(a),
      ancien: (a, b) => (onlineSince(a) || '9').localeCompare(onlineSince(b) || '9'),
    };
    return [...r].sort(by[sort]);
  }, [items, q, f, plat, cat, sort]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="surtitre">Inventaire</p><h1 className="titre-page mt-2">Stock</h1></div>
        <Link href="/article/nouveau" className="btn-encre" data-testid="stock-new"><Plus size={16} /> Nouvel article</Link>
      </div>

      <div className="flex flex-col gap-3">
        <Segmented label="Filtrer par statut" value={f} onChange={setF} options={[
          { v: 'tous', l: 'Disponibles', n: count('tous') }, { v: 'en_ligne', l: 'En ligne', n: count('en_ligne') },
          { v: 'stock', l: 'Non publiés', n: count('stock') }, { v: 'brouillon', l: 'Brouillons', n: count('brouillon') }, { v: 'vendu', l: 'Vendus', n: count('vendu') },
        ]} />
        <div className="grid grid-cols-2 md:grid-cols-[1fr_180px_200px_170px_auto] gap-2">
          <label className="relative col-span-2 md:col-span-1">
            <span className="sr-only">Rechercher</span>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gris" aria-hidden />
            <input className="champ pl-9" type="search" placeholder="Référence, marque, taille, emplacement…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="stock-search" />
          </label>
          <select className="champ" aria-label="Plateforme" value={plat} onChange={(e) => setPlat(e.target.value)} data-testid="stock-platform">
            <option value="">Toutes plateformes</option>{PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}<option value="aucune">Publié nulle part</option>
          </select>
          <select className="champ" aria-label="Catégorie" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Toutes catégories</option>
            {CATEGORY_GROUPS.map((g) => <optgroup key={g.group} label={g.group}>{g.items.map((c) => <option key={c}>{c}</option>)}</optgroup>)}
          </select>
          <select className="champ" aria-label="Trier" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">Plus récents</option><option value="prix">Prix décroissant</option><option value="marge">Meilleure marge</option><option value="ancien">En ligne depuis longtemps</option>
          </select>
          <div className="hidden md:flex gap-1">
            <button className={`btn-ligne !px-2.5 ${view === 'grille' ? '!bg-encre !text-creme' : ''}`} aria-label="Vue grille" aria-pressed={view === 'grille'} onClick={() => setView('grille')}><LayoutGrid size={18} /></button>
            <button className={`btn-ligne !px-2.5 ${view === 'liste' ? '!bg-encre !text-creme' : ''}`} aria-label="Vue liste" aria-pressed={view === 'liste'} onClick={() => setView('liste')}><List size={18} /></button>
          </div>
        </div>
      </div>

      {!list.length ? (
        <Empty title="Rien ici" text={items.length ? 'Aucun article ne correspond à ces filtres.' : 'Ajoute ton premier article : photo, prix d’achat, et MiMo prépare les annonces.'}
          action={items.length ? <button className="btn-ligne" onClick={() => { setQ(''); setPlat(''); setCat(''); setF('tous'); }}>Effacer les filtres</button> : <Link href="/article/nouveau" className="btn-encre">Ajouter un article</Link>} />
      ) : view === 'grille' ? (
        <ul className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3" data-testid="stock-grid">
          {list.map((i) => {
            const st = staleInfo(i, settings, today); const since = onlineSince(i);
            return (
              <li key={i.id} className="carte overflow-hidden flex flex-col">
                <button className="block text-left" onClick={() => navigate('/article/' + i.id)} aria-label={`Ouvrir ${i.title}`}>
                  <div className="relative aspect-square">
                    <Photo id={i.photos[0]} alt={i.title} fallback={initials(i)} className="absolute inset-0 h-full w-full" />
                    <div className="absolute left-2 top-2"><StatusBadge s={i.status} /></div>
                    {st?.stale && <span className="absolute right-2 top-2 pastille bg-terre text-white">{st.days} j</span>}
                  </div>
                  <div className="p-3 pb-2">
                    <p className="text-[12px] text-gris num">{i.ref}{i.size && i.size !== 'Unique' ? ' · ' + i.size : ''}</p>
                    <p className="font-semibold leading-snug line-clamp-2 mt-0.5">{i.title}</p>
                    <p className="text-[13px] text-gris truncate">{i.brand || i.category || '—'}</p>
                  </div>
                </button>
                <div className="mt-auto px-3 pb-3 space-y-2">
                  <div className="flex items-baseline justify-between"><span className="text-[18px] font-semibold num">{eur(i.price)}</span><span className="text-[12px] text-gris num">marge {Math.round(itemMarginPct(i))} %</span></div>
                  <div className="flex items-center justify-between gap-2">
                    <PlatformDots item={i} />
                    {i.status !== 'vendu' && <button className="text-[13px] font-semibold text-or-fonce hover:underline min-h-[32px]" onClick={() => setSelling(i)} data-testid={`sell-${i.id}`}>Vendu</button>}
                  </div>
                  {since && i.status !== 'vendu' && <p className="text-[12px] text-gris num">En ligne depuis {daysBetween(since, today)} j · {i.views} vues</p>}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="carte overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead><tr className="text-left text-[12px] uppercase tracking-[0.06em] text-gris border-b border-trait">
              <th className="p-3 font-semibold">Article</th><th className="p-3 font-semibold">Statut</th><th className="p-3 font-semibold">Plateformes</th><th className="p-3 font-semibold text-right">Achat</th><th className="p-3 font-semibold text-right">Prix</th><th className="p-3 font-semibold">Emplacement</th><th className="p-3" />
            </tr></thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.id} className="border-b border-trait last:border-0 hover:bg-white/60">
                  <td className="p-3"><button className="flex items-center gap-3 text-left" onClick={() => navigate('/article/' + i.id)}><Photo id={i.photos[0]} alt="" fallback={initials(i)} className="h-10 w-10 rounded shrink-0" /><span><span className="block font-medium">{i.title}</span><span className="text-[12px] text-gris num">{i.ref} · {i.brand}</span></span></button></td>
                  <td className="p-3"><StatusBadge s={i.status} /></td><td className="p-3"><PlatformDots item={i} /></td>
                  <td className="p-3 text-right num text-gris">{eur(i.buyPrice)}</td><td className="p-3 text-right num font-semibold">{eur(i.price)}</td><td className="p-3 text-gris">{i.location || '—'}</td>
                  <td className="p-3 text-right">{i.status !== 'vendu' && <button className="btn-ligne btn-sm" onClick={() => setSelling(i)}>Vendu</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <SellModal item={selling} onClose={() => setSelling(null)} />
    </div>
  );
}
