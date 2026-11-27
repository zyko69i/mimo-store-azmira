import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { AlertTriangle, ArrowRight, Trash2, Search, Truck } from 'lucide-react';
import { useStore, upsert, remove, getState } from '../lib/store';
import { SALE_STEPS, SaleStatus, Sale, eur2, fdate, platformLabel, saleNet, saleProfit, shipDeadline, todayISO, daysBetween, norm } from '../lib/domain';
import { Segmented, useConfirm, useToast, Empty, Stat } from '../components/ui';

type F = 'tout' | SaleStatus;
const TONE: Record<SaleStatus, string> = { a_envoyer: 'bg-or-clair text-or-fonce', envoye: 'bg-[#E1ECF5] text-[#2C5C83]', livre: 'bg-sauge-clair text-sauge', paye: 'bg-encre/10 text-encre' };

export default function Ventes() {
  const { sales, clients, settings } = useStore((s) => s);
  const [f, setF] = useState<F>('a_envoyer');
  const [q, setQ] = useState('');
  const confirm = useConfirm(); const toast = useToast();
  const today = todayISO();
  const count = (s: SaleStatus) => sales.filter((x) => x.status === s).length;
  const rows = useMemo(() => sales
    .filter((x) => f === 'tout' || x.status === f)
    .filter((x) => !q || norm([x.itemTitle, x.itemRef, x.tracking, clients.find((c) => c.id === x.clientId)?.name].join(' ')).includes(norm(q)))
    .sort((a, b) => (f === 'a_envoyer' ? shipDeadline(settings, a).localeCompare(shipDeadline(settings, b)) : b.date.localeCompare(a.date))), [sales, f, q, clients, settings]);
  const late = sales.filter((x) => x.status === 'a_envoyer' && shipDeadline(settings, x) < today);
  const month = today.slice(0, 7);
  const mSales = sales.filter((x) => x.date.startsWith(month));

  const patch = (s: Sale, p: Partial<Sale>) => upsert('sales', { ...s, ...p });
  const advance = (s: Sale) => {
    const i = SALE_STEPS.findIndex((x) => x.id === s.status); const next = SALE_STEPS[i + 1]; if (!next) return;
    if (next.id === 'envoye' && !s.tracking && !s.handover) toast('Envoi noté. Pense à ajouter le numéro de suivi.', 'warn'); else toast(`Vente passée à « ${next.label} ».`);
    patch(s, { status: next.id });
  };
  const del = async (s: Sale) => {
    if (!(await confirm({ title: 'Supprimer cette vente ?', message: `${s.itemTitle} (${eur2(s.price)}) sera retirée. L'article redevient disponible dans le stock.`, confirm: 'Supprimer', danger: true }))) return;
    remove('sales', s.id);
    const it = getState().items.find((i) => i.id === s.itemId);
    if (it && it.status === 'vendu') upsert('items', { ...it, status: Object.values(it.platforms).some((l) => l?.on) ? 'en_ligne' : 'stock', updatedAt: new Date().toISOString() });
    toast('Vente supprimée.');
  };

  return (
    <div className="space-y-5">
      <div><p className="surtitre">Suivi</p><h1 className="titre-page mt-2">Ventes et envois</h1>
        <p className="mt-2 text-gris max-w-2xl">Délai d'envoi : {settings.shipDays} jours ouvrés après la vente (week-ends et jours fériés exclus).</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="À envoyer" value={count('a_envoyer')} sub={late.length ? `${late.length} en retard` : 'Aucun retard'} tone={late.length ? 'bad' : 'ok'} />
        <Stat label="En transit" value={count('envoye')} />
        <Stat label="Ventes du mois" value={mSales.length} sub={eur2(mSales.reduce((a, x) => a + x.price, 0))} />
        <Stat label="Bénéfice du mois" value={eur2(mSales.reduce((a, x) => a + saleProfit(x), 0))} tone="ok" />
      </div>
      {late.length > 0 && <div className="flex items-start gap-3 rounded-md bg-terre-clair p-4 text-terre"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><p className="text-[14px]"><strong>{late.length} colis en retard</strong> : {late.map((x) => x.itemTitle).join(', ')}. Envoie-les en priorité.</p></div>}
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Filtrer les ventes" value={f} onChange={setF} options={[{ v: 'tout', l: 'Toutes', n: sales.length }, ...SALE_STEPS.map((s) => ({ v: s.id as F, l: s.label, n: count(s.id) }))]} />
        <label className="relative flex-1 min-w-[200px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gris" /><input className="champ !pl-9" placeholder="Article, client, suivi…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher une vente" /></label>
      </div>
      {!rows.length ? <Empty title="Rien ici" text={f === 'a_envoyer' ? 'Aucun colis à préparer. Les ventes enregistrées depuis le stock apparaissent ici.' : 'Aucune vente ne correspond.'} action={<Link href="/stock" className="btn-encre">Aller au stock</Link>} /> : (
        <ul className="space-y-2">
          {rows.map((s) => {
            const dl = shipDeadline(settings, s); const left = daysBetween(today, dl); const isLate = s.status === 'a_envoyer' && dl < today;
            const next = SALE_STEPS[SALE_STEPS.findIndex((x) => x.id === s.status) + 1];
            const client = clients.find((c) => c.id === s.clientId);
            return (
              <li key={s.id} className={`carte p-4 ${isLate ? 'ring-1 ring-terre/40' : ''}`} data-testid={`sale-${s.id}`}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-[220px]">
                    <div className="flex flex-wrap items-center gap-2"><span className={`pastille ${TONE[s.status]}`}>{SALE_STEPS.find((x) => x.id === s.status)?.label}</span><span className="text-[12px] text-gris num">{s.itemRef}</span></div>
                    <p className="mt-1.5 font-semibold">{s.itemTitle}</p>
                    <p className="text-[13px] text-gris">{fdate(s.date, { day: 'numeric', month: 'long' })} · {s.platform === 'main_propre' ? 'Main propre' : platformLabel(s.platform)}{client && <> · <Link href="/clients" className="hover:underline">{client.name}</Link></>}</p>
                    {s.status === 'a_envoyer' && <p className={`mt-1 text-[13px] font-semibold ${isLate ? 'text-terre' : left <= 1 ? 'text-or-fonce' : 'text-sauge'}`}><Truck size={14} className="inline -mt-0.5 mr-1" />{isLate ? `En retard de ${-left} j — limite le ${fdate(dl)}` : left === 0 ? "À envoyer aujourd'hui" : `À envoyer avant le ${fdate(dl, { weekday: 'long', day: 'numeric', month: 'long' })}`}</p>}
                  </div>
                  <div className="text-right"><p className="text-[18px] font-semibold num">{eur2(s.price)}</p><p className="text-[12px] text-gris num">net {eur2(saleNet(s))} · bénéfice <span className={saleProfit(s) >= 0 ? 'text-sauge' : 'text-terre'}>{eur2(saleProfit(s))}</span></p></div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {!s.handover && <input className="champ !min-h-[40px] max-w-[240px]" placeholder="N° de suivi" value={s.tracking} onChange={(e) => patch(s, { tracking: e.target.value })} aria-label={`Numéro de suivi ${s.itemTitle}`} />}
                  <input className="champ !min-h-[40px] w-[110px] num" type="number" step="0.01" min="0" placeholder="Frais port" value={s.shippingCost || ''} onChange={(e) => patch(s, { shippingCost: +e.target.value })} aria-label="Frais de port à ta charge" title="Frais de port à ta charge" />
                  <div className="flex-1" />
                  {next && <button className="btn-encre btn-sm" onClick={() => advance(s)} data-testid={`sale-next-${s.id}`}>{next.label} <ArrowRight size={15} /></button>}
                  <button className="btn-ligne btn-sm !px-2.5 text-terre" onClick={() => del(s)} aria-label={`Supprimer la vente ${s.itemTitle}`}><Trash2 size={16} /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
