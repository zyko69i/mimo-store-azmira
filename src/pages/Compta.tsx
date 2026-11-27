import { useMemo, useState } from 'react';
import { Plus, Download, Trash2 } from 'lucide-react';
import { useStore, upsert, remove, updateSettings } from '../lib/store';
import { EXPENSE_CATEGORIES, Expense, eur2, eur, fdate, saleProfit, todayISO, uid } from '../lib/domain';
import { Modal, Field, Stat, useConfirm, useToast, download } from '../components/ui';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const csvCell = (v: string | number) => { const s = String(v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const num = (n: number) => n.toFixed(2).replace('.', ',');

export default function Compta() {
  const { sales, expenses, settings } = useStore((s) => s);
  const years = [...new Set([todayISO().slice(0, 4), ...sales.map((x) => x.date.slice(0, 4)), ...expenses.map((e) => e.date.slice(0, 4))])].sort().reverse();
  const [year, setYear] = useState(years[0]);
  const [exp, setExp] = useState<Expense | null>(null);
  const confirm = useConfirm(); const toast = useToast();

  const ys = sales.filter((x) => x.date.startsWith(year));
  const ye = expenses.filter((e) => e.date.startsWith(year));
  const rows = useMemo(() => MONTHS.map((m, i) => {
    const k = `${year}-${String(i + 1).padStart(2, '0')}`;
    const s = ys.filter((x) => x.date.startsWith(k)); const e = ye.filter((x) => x.date.startsWith(k) && x.category !== 'Achat de stock');
    const ca = s.reduce((a, x) => a + x.price, 0); const dep = e.reduce((a, x) => a + x.amount, 0);
    const urssaf = ca * (settings.urssafRate + (settings.vl ? settings.vlRate : 0)) / 100;
    return { m, k, n: s.length, ca, profit: s.reduce((a, x) => a + saleProfit(x), 0) - dep, dep, urssaf };
  }), [ys, ye, settings, year]);
  const ca = rows.reduce((a, r) => a + r.ca, 0); const urssaf = rows.reduce((a, r) => a + r.urssaf, 0);
  const profit = rows.reduce((a, r) => a + r.profit, 0);
  const stockBuy = ye.filter((e) => e.category === 'Achat de stock').reduce((a, e) => a + e.amount, 0);
  const pctSeuil = Math.min(100, (ca / settings.caThreshold) * 100);

  const saveExp = () => {
    if (!exp || !exp.label.trim() || !(exp.amount > 0)) return toast('Libellé et montant requis.', 'warn');
    upsert('expenses', { ...exp, id: exp.id || uid(), label: exp.label.trim() }); toast('Dépense enregistrée.'); setExp(null);
  };
  const delExp = async (e: Expense) => { if (await confirm({ title: 'Supprimer cette dépense ?', message: `${e.label} — ${eur2(e.amount)}`, confirm: 'Supprimer', danger: true })) { remove('expenses', e.id); toast('Dépense supprimée.'); } };
  const exportCsv = () => {
    const head = ['Date', 'Référence', 'Article', 'Plateforme', 'Prix de vente', 'Frais', 'Port', "Prix d'achat", 'Bénéfice'];
    const lines = ys.sort((a, b) => a.date.localeCompare(b.date)).map((x) => [x.date, x.itemRef, x.itemTitle, x.platform, num(x.price), num(x.fees), num(x.shippingCost), num(x.buyPrice), num(saleProfit(x))]);
    const dep = ye.map((e) => [e.date, '', e.label, 'Dépense : ' + e.category, '', '', '', num(e.amount), num(-e.amount)]);
    download(`mimo-livre-recettes-${year}.csv`, '\ufeff' + [head, ...lines, [], ['Dépenses'], ...dep].map((r) => r.map(csvCell).join(';')).join('\n'), 'text/csv;charset=utf-8');
    toast('Livre des recettes exporté.');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="surtitre">Micro-entreprise</p><h1 className="titre-page mt-2">Comptabilité</h1></div>
        <div className="flex gap-2">
          <select className="champ !w-auto" value={year} onChange={(e) => setYear(e.target.value)} aria-label="Année">{years.map((y) => <option key={y}>{y}</option>)}</select>
          <button className="btn-ligne" onClick={exportCsv} data-testid="csv"><Download size={16} /> Export CSV</button>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={`Chiffre d'affaires ${year}`} value={eur(ca)} sub={`${ys.length} ventes`} />
        <Stat label="Bénéfice estimé" value={eur(profit)} tone={profit >= 0 ? 'ok' : 'bad'} sub="après achats, frais et dépenses" />
        <Stat label="Cotisations URSSAF" value={eur(urssaf)} sub={`${String(settings.urssafRate).replace('.', ',')} %${settings.vl ? ` + ${settings.vlRate} % impôt` : ''} du CA`} tone="warn" />
        <Stat label="Achats de stock" value={eur(stockBuy)} sub="saisis en dépenses" />
      </div>
      <section className="carte p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-[16px] font-semibold">Seuil de la micro-entreprise</h2><span className="text-[13px] text-gris num">{eur(ca)} / {eur(settings.caThreshold)}</span></div>
        <div className="mt-3 h-2.5 rounded-full bg-encre/10 overflow-hidden" role="progressbar" aria-valuenow={Math.round(pctSeuil)} aria-valuemin={0} aria-valuemax={100} aria-label="Part du seuil atteinte"><div className={`h-full ${pctSeuil > 85 ? 'bg-terre' : 'bg-or'}`} style={{ width: pctSeuil + '%' }} /></div>
        <label className="mt-4 flex items-center gap-3 text-[14px]"><input type="checkbox" className="h-5 w-5 accent-[#1B1A17]" checked={settings.vl} onChange={(e) => updateSettings({ vl: e.target.checked })} /> J'ai opté pour le versement libératoire de l'impôt ({settings.vlRate} %)</label>
        <p className="mt-3 text-[12px] text-gris">Repères 2026 pour la vente de marchandises : cotisations 12,3 % du CA, seuil de 203 100 €. Sources : <a className="underline" href="https://entreprendre.service-public.gouv.fr/vosdroits/F37353" target="_blank" rel="noreferrer">service-public.fr (cotisations)</a>, <a className="underline" href="https://entreprendre.service-public.gouv.fr/vosdroits/F36232" target="_blank" rel="noreferrer">service-public.fr (seuils)</a>. Estimation indicative : la déclaration officielle se fait sur autoentrepreneur.urssaf.fr.</p>
      </section>
      <section className="carte overflow-x-auto">
        <table className="w-full text-[14px] min-w-[620px]">
          <thead><tr className="text-left text-[12px] uppercase tracking-[0.06em] text-gris border-b border-trait"><th className="px-4 py-3 font-semibold">Mois</th><th className="px-4 py-3 font-semibold text-right">Ventes</th><th className="px-4 py-3 font-semibold text-right">CA</th><th className="px-4 py-3 font-semibold text-right">Dépenses</th><th className="px-4 py-3 font-semibold text-right">Bénéfice</th><th className="px-4 py-3 font-semibold text-right">URSSAF</th></tr></thead>
          <tbody className="num">
            {rows.map((r) => <tr key={r.k} className={`border-b border-trait last:border-0 ${!r.n && !r.dep ? 'text-gris/60' : ''}`}><td className="px-4 py-2.5 font-sans">{r.m}</td><td className="px-4 py-2.5 text-right">{r.n}</td><td className="px-4 py-2.5 text-right">{eur2(r.ca)}</td><td className="px-4 py-2.5 text-right">{eur2(r.dep)}</td><td className={`px-4 py-2.5 text-right ${r.profit < 0 ? 'text-terre' : ''}`}>{eur2(r.profit)}</td><td className="px-4 py-2.5 text-right">{eur2(r.urssaf)}</td></tr>)}
            <tr className="font-semibold bg-creme/60"><td className="px-4 py-3 font-sans">Total</td><td className="px-4 py-3 text-right">{ys.length}</td><td className="px-4 py-3 text-right">{eur2(ca)}</td><td className="px-4 py-3 text-right">{eur2(rows.reduce((a, r) => a + r.dep, 0))}</td><td className="px-4 py-3 text-right">{eur2(profit)}</td><td className="px-4 py-3 text-right">{eur2(urssaf)}</td></tr>
          </tbody>
        </table>
      </section>
      <section className="carte p-5">
        <div className="flex items-center justify-between gap-2"><h2 className="text-[16px] font-semibold">Dépenses {year}</h2><button className="btn-encre btn-sm" onClick={() => setExp({ id: '', date: todayISO(), label: '', category: EXPENSE_CATEGORIES[1], amount: 0 })} data-testid="exp-new"><Plus size={15} /> Ajouter</button></div>
        {!ye.length ? <p className="mt-3 text-gris text-[14px]">Aucune dépense saisie.</p> : (
          <ul className="mt-3 divide-y divide-trait">
            {ye.sort((a, b) => b.date.localeCompare(a.date)).map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2.5">
                <button className="flex-1 min-w-0 text-left" onClick={() => setExp({ ...e })} aria-label={`Modifier ${e.label}`}><p className="font-medium truncate">{e.label}</p><p className="text-[12px] text-gris">{fdate(e.date)} · {e.category}</p></button>
                <span className="num font-semibold">{eur2(e.amount)}</span>
                <button className="btn-ligne btn-sm !px-2.5 text-terre" onClick={() => delExp(e)} aria-label={`Supprimer ${e.label}`}><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Modal open={!!exp} onClose={() => setExp(null)} title={exp?.id ? 'Modifier la dépense' : 'Nouvelle dépense'} footer={<><button className="btn-ligne" onClick={() => setExp(null)}>Annuler</button><button className="btn-encre" onClick={saveExp} data-testid="exp-save">Enregistrer</button></>}>
        {exp && <div className="space-y-3">
          <Field label="Libellé"><input className="champ" value={exp.label} onChange={(e) => setExp({ ...exp, label: e.target.value })} placeholder="Ex. Cartons et papier bulle" data-testid="exp-label" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Montant (€)"><input className="champ num" type="number" step="0.01" min="0" value={exp.amount || ''} onChange={(e) => setExp({ ...exp, amount: +e.target.value })} data-testid="exp-amount" /></Field>
            <Field label="Date"><input className="champ" type="date" value={exp.date} onChange={(e) => setExp({ ...exp, date: e.target.value })} /></Field>
          </div>
          <Field label="Catégorie"><select className="champ" value={exp.category} onChange={(e) => setExp({ ...exp, category: e.target.value })}>{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        </div>}
      </Modal>
    </div>
  );
}
