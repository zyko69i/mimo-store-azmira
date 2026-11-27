import { Link, useLocation } from 'wouter';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ArrowRight, TrendingDown, Truck, Upload, AlertTriangle } from 'lucide-react';
import { useStore, upsert } from '../lib/store';
import { eur, eur2, todayISO, daysBetween, saleProfit, shipDeadline, staleInfo, platformLabel, PLATFORMS, fdate, listedPlatforms } from '../lib/domain';
import { Stat, Photo, initials, useToast } from '../components/ui';

const monthKey = (d: string) => d.slice(0, 7);
const monthName = (k: string) => new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, 1).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');

export default function Dashboard() {
  const { items, sales, expenses, settings } = useStore((s) => s);
  const [, navigate] = useLocation();
  const toast = useToast();
  const today = todayISO();
  const thisM = monthKey(today);
  const prevD = new Date(); prevD.setDate(1); prevD.setMonth(prevD.getMonth() - 1);
  const prevM = prevD.toISOString().slice(0, 7);

  const caM = sales.filter((x) => monthKey(x.date) === thisM).reduce((a, x) => a + x.price, 0);
  const caP = sales.filter((x) => monthKey(x.date) === prevM).reduce((a, x) => a + x.price, 0);
  const profitM = sales.filter((x) => monthKey(x.date) === thisM).reduce((a, x) => a + saleProfit(x), 0)
    - expenses.filter((e) => monthKey(e.date) === thisM && e.category !== 'Achat de stock').reduce((a, e) => a + e.amount, 0);
  const live = items.filter((i) => i.status !== 'vendu');
  const stockValue = live.reduce((a, i) => a + i.price, 0);
  const stockCost = live.reduce((a, i) => a + i.buyPrice, 0);
  const toShip = sales.filter((x) => x.status === 'a_envoyer').map((x) => ({ x, dl: shipDeadline(settings, x) })).sort((a, b) => a.dl.localeCompare(b.dl));
  const late = toShip.filter((t) => t.dl < today);

  const months: string[] = []; for (let k = 5; k >= 0; k--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - k); months.push(d.toISOString().slice(0, 7)); }
  const chart = months.map((m) => {
    const ss = sales.filter((x) => monthKey(x.date) === m);
    return { mois: monthName(m), CA: Math.round(ss.reduce((a, x) => a + x.price, 0)), Bénéfice: Math.round(ss.reduce((a, x) => a + saleProfit(x), 0)) };
  });
  const byPlatform = PLATFORMS.map((p) => ({ p, ca: sales.filter((x) => x.platform === p.id).reduce((a, x) => a + x.price, 0), n: sales.filter((x) => x.platform === p.id).length })).filter((r) => r.n).sort((a, b) => b.ca - a.ca);
  const maxCa = Math.max(1, ...byPlatform.map((r) => r.ca));
  const stale = live.map((i) => ({ i, s: staleInfo(i, settings, today) })).filter((r) => r.s?.stale).sort((a, b) => (b.s!.days - a.s!.days));
  const unpublished = live.filter((i) => i.status !== 'brouillon' && listedPlatforms(i).length === 0);
  const delta = caP ? Math.round(((caM - caP) / caP) * 100) : null;

  const applyMarkdown = (id: string, price: number) => {
    const i = items.find((x) => x.id === id)!; const platforms = { ...i.platforms };
    Object.keys(platforms).forEach((k) => { const p = (platforms as any)[k]; if (p?.on) (platforms as any)[k] = { ...p, price }; });
    upsert('items', { ...i, price, platforms, priceHistory: [...i.priceHistory, { date: today, price }], updatedAt: new Date().toISOString() });
    toast(`Prix de « ${i.title} » passé à ${eur(price)}. Pense à le modifier sur les plateformes.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="surtitre">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="titre-page mt-2">{settings.shopName}</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/stock" className="btn-ligne">Voir le stock</Link>
          <Link href="/article/nouveau" className="btn-encre" data-testid="dash-new">Ajouter un article</Link>
        </div>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Chiffres clés">
        <Stat label="CA ce mois" value={eur(caM)} sub={delta === null ? 'Premier mois suivi' : `${delta >= 0 ? '+' : ''}${delta} % vs ${monthName(prevM)}`} tone={delta !== null && delta < 0 ? 'warn' : undefined} />
        <Stat label="Bénéfice net ce mois" value={eur(profitM)} sub="Après achat, frais et dépenses" tone={profitM >= 0 ? 'ok' : 'bad'} />
        <Stat label="Valeur du stock" value={eur(stockValue)} sub={`${live.length} articles · marge potentielle ${eur(stockValue - stockCost)}`} />
        <Stat label="À envoyer" value={toShip.length} sub={late.length ? `${late.length} en retard` : toShip[0] ? `Prochain avant le ${fdate(toShip[0].dl)}` : 'Rien en attente'} tone={late.length ? 'bad' : toShip.length ? 'warn' : 'ok'} />
      </section>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
        <section className="carte p-5">
          <div className="flex items-baseline justify-between"><h2 className="text-[16px] font-semibold">Ventes des 6 derniers mois</h2><span className="text-[13px] text-gris num">Total {eur(chart.reduce((a, c) => a + c.CA, 0))}</span></div>
          <div className="h-[230px] mt-4 -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} barGap={3}>
                <CartesianGrid vertical={false} stroke="rgba(27,26,23,.08)" />
                <XAxis dataKey="mois" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6B655C' }} />
                <YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 12, fill: '#6B655C' }} tickFormatter={(v) => v + ' €'} />
                <Tooltip cursor={{ fill: 'rgba(168,135,90,.08)' }} formatter={(v: any) => eur(+v)} contentStyle={{ borderRadius: 6, border: '1px solid rgba(27,26,23,.1)', fontSize: 13 }} />
                <Bar dataKey="CA" fill="#1B1A17" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Bénéfice" fill="#A8875A" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 text-[12px] text-gris"><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-encre" />Chiffre d'affaires</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-or" />Bénéfice</span></div>
        </section>

        <section className="carte p-5">
          <h2 className="text-[16px] font-semibold">Où tu vends le mieux</h2>
          <ul className="mt-4 space-y-3">
            {byPlatform.map(({ p, ca, n }) => (
              <li key={p.id}>
                <div className="flex justify-between text-[14px]"><span className="font-medium">{p.label}</span><span className="num text-gris">{eur(ca)} · {n} vente{n > 1 ? 's' : ''}</span></div>
                <div className="mt-1.5 h-2 rounded-sm bg-encre/5"><div className="h-2 rounded-sm" style={{ width: `${(ca / maxCa) * 100}%`, background: p.color }} /></div>
              </li>
            ))}
            {!byPlatform.length && <li className="text-gris text-[14px]">Aucune vente enregistrée pour l'instant.</li>}
          </ul>
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="carte p-5">
          <div className="flex items-center justify-between"><h2 className="text-[16px] font-semibold flex items-center gap-2"><Truck size={18} strokeWidth={1.7} /> Envois à préparer</h2><Link href="/ventes" className="text-[13px] font-semibold text-or-fonce flex items-center gap-1">Tout voir <ArrowRight size={14} /></Link></div>
          <ul className="mt-3 divide-y divide-trait">
            {toShip.slice(0, 4).map(({ x, dl }) => {
              const left = daysBetween(today, dl);
              return (
                <li key={x.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0"><p className="truncate font-medium">{x.itemTitle}</p><p className="text-[13px] text-gris">{platformLabel(x.platform)} · vendu le {fdate(x.date)}</p></div>
                  <span className={`pastille ${left < 0 ? 'bg-terre text-white' : left <= 1 ? 'bg-terre-clair text-terre' : 'bg-or-clair text-or-fonce'}`}>{left < 0 ? `En retard de ${-left} j` : left === 0 ? "Aujourd'hui" : `Avant le ${fdate(dl)}`}</span>
                </li>
              );
            })}
            {!toShip.length && <li className="py-6 text-gris text-[14px]">Tous les colis sont partis.</li>}
          </ul>
        </section>

        <section className="carte p-5">
          <h2 className="text-[16px] font-semibold flex items-center gap-2"><TrendingDown size={18} strokeWidth={1.7} /> Articles qui traînent</h2>
          <p className="text-[13px] text-gris mt-1">En ligne depuis plus de {settings.staleDays} jours : baisse de {settings.markdownPct} % proposée, jamais sous le prix plancher.</p>
          <ul className="mt-3 divide-y divide-trait">
            {stale.slice(0, 4).map(({ i, s }) => (
              <li key={i.id} className="py-3 flex items-center gap-3">
                <Photo id={i.photos[0]} alt={i.title} fallback={initials(i)} className="h-12 w-12 rounded shrink-0" />
                <button className="flex-1 min-w-0 text-left" onClick={() => navigate('/article/' + i.id)}>
                  <p className="truncate font-medium">{i.title} {i.brand}</p><p className="text-[13px] text-gris num">{s!.days} jours en ligne · {i.views} vues · {i.favorites} favoris</p>
                </button>
                <button className="btn-doux btn-sm num" data-testid={`markdown-${i.id}`} onClick={() => applyMarkdown(i.id, s!.suggested)}>{eur(i.price)} → {eur(s!.suggested)}</button>
              </li>
            ))}
            {!stale.length && <li className="py-6 text-gris text-[14px]">Aucun article ne stagne. Bon rythme.</li>}
          </ul>
        </section>
      </div>

      {(unpublished.length > 0 || late.length > 0) && (
        <section className="carte p-5">
          <h2 className="text-[16px] font-semibold flex items-center gap-2"><AlertTriangle size={18} strokeWidth={1.7} className="text-or-fonce" /> À faire</h2>
          <ul className="mt-3 space-y-2 text-[14px]">
            {late.length > 0 && <li className="flex items-center justify-between gap-3"><span>{late.length} colis dépasse{late.length > 1 ? 'nt' : ''} le délai d'envoi de {settings.shipDays} jours ouvrés.</span><Link href="/ventes" className="btn-ligne btn-sm">Ouvrir les envois</Link></li>}
            {unpublished.length > 0 && <li className="flex items-center justify-between gap-3"><span>{unpublished.length} article{unpublished.length > 1 ? 's' : ''} en stock ne {unpublished.length > 1 ? 'sont' : 'est'} publié{unpublished.length > 1 ? 's' : ''} nulle part ({eur(unpublished.reduce((a, i) => a + i.price, 0))} immobilisés).</span><Link href="/annonces" className="btn-ligne btn-sm"><Upload size={14} /> Préparer les annonces</Link></li>}
          </ul>
        </section>
      )}
      <p className="text-[12px] text-gris num">Marge moyenne par vente : {eur2(sales.length ? sales.reduce((a, x) => a + saleProfit(x), 0) / sales.length : 0)}</p>
    </div>
  );
}
