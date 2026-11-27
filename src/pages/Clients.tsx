import { useState } from 'react';
import { Plus, Search, Trash2, Pencil } from 'lucide-react';
import { useStore, upsert, remove } from '../lib/store';
import { Client, uid, eur2, fdate, norm, platformLabel } from '../lib/domain';
import { Modal, Field, useConfirm, useToast, Empty } from '../components/ui';

const blank = (): Client => ({ id: '', name: '', contact: '', city: '', platform: '', notes: '', createdAt: '' });

export default function Clients() {
  const { clients, sales } = useStore((s) => s);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Client | null>(null);
  const [open, setOpen] = useState<string>('');
  const confirm = useConfirm(); const toast = useToast();
  const stats = (c: Client) => { const s = sales.filter((x) => x.clientId === c.id); return { s, total: s.reduce((a, x) => a + x.price, 0) }; };
  const rows = clients.filter((c) => !q || norm([c.name, c.contact, c.city, c.notes].join(' ')).includes(norm(q))).map((c) => ({ c, ...stats(c) })).sort((a, b) => b.total - a.total);

  const save = () => {
    if (!edit?.name.trim()) return toast('Indique au moins un nom ou pseudo.', 'warn');
    upsert('clients', { ...edit, id: edit.id || uid(), name: edit.name.trim(), createdAt: edit.createdAt || new Date().toISOString() });
    toast(edit.id ? 'Client modifié.' : 'Client ajouté.'); setEdit(null);
  };
  const del = async (c: Client) => {
    if (!(await confirm({ title: 'Supprimer ce client ?', message: `${c.name} sera retiré. Ses ventes restent enregistrées, sans nom associé.`, confirm: 'Supprimer', danger: true }))) return;
    remove('clients', c.id); toast('Client supprimé.');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="surtitre">Carnet</p><h1 className="titre-page mt-2">Clients</h1><p className="mt-2 text-gris">Les acheteurs fidèles, leurs achats et ce qu'ils recherchent.</p></div>
        <button className="btn-encre" onClick={() => setEdit(blank())} data-testid="client-new"><Plus size={16} /> Nouveau client</button>
      </div>
      <label className="relative block max-w-md"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gris" /><input className="champ !pl-9" placeholder="Nom, pseudo, ville…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un client" /></label>
      {!rows.length ? <Empty title="Aucun client" text="Ajoute un acheteur ici, ou directement au moment d'enregistrer une vente." action={<button className="btn-encre" onClick={() => setEdit(blank())}>Ajouter un client</button>} /> : (
        <ul className="grid md:grid-cols-2 gap-3">
          {rows.map(({ c, s, total }) => (
            <li key={c.id} className="carte p-4" data-testid={`client-${c.id}`}>
              <div className="flex items-start gap-3">
                <span className="h-11 w-11 shrink-0 grid place-items-center rounded-full bg-or-clair font-display text-[20px] text-or-fonce">{c.name.trim()[0]?.toUpperCase()}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{c.name}</p>
                  <p className="text-[13px] text-gris truncate">{[c.contact, c.city, c.platform].filter(Boolean).join(' · ') || '—'}</p>
                </div>
                <div className="text-right"><p className="font-semibold num">{eur2(total)}</p><p className="text-[12px] text-gris">{s.length} achat{s.length > 1 ? 's' : ''}</p></div>
              </div>
              {c.notes && <p className="mt-2 text-[13px] rounded bg-creme px-3 py-2">{c.notes}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {s.length > 0 && <button className="btn-ligne btn-sm" onClick={() => setOpen(open === c.id ? '' : c.id)} aria-expanded={open === c.id}>Historique</button>}
                <button className="btn-ligne btn-sm" onClick={() => setEdit({ ...c })} aria-label={`Modifier ${c.name}`}><Pencil size={14} /> Modifier</button>
                <button className="btn-ligne btn-sm !px-2.5 text-terre" onClick={() => del(c)} aria-label={`Supprimer ${c.name}`}><Trash2 size={15} /></button>
              </div>
              {open === c.id && <ul className="mt-3 divide-y divide-trait text-[13px]">{s.sort((a, b) => b.date.localeCompare(a.date)).map((x) => <li key={x.id} className="flex justify-between gap-2 py-2"><span className="truncate">{fdate(x.date)} · {x.itemTitle} <span className="text-gris">({x.platform === 'main_propre' ? 'main propre' : platformLabel(x.platform)})</span></span><span className="num">{eur2(x.price)}</span></li>)}</ul>}
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Modifier le client' : 'Nouveau client'} footer={<><button className="btn-ligne" onClick={() => setEdit(null)}>Annuler</button><button className="btn-encre" onClick={save} data-testid="client-save">Enregistrer</button></>}>
        {edit && <div className="space-y-3">
          <Field label="Nom ou pseudo"><input className="champ" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} data-testid="client-name" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact"><input className="champ" value={edit.contact} onChange={(e) => setEdit({ ...edit, contact: e.target.value })} placeholder="Téléphone, e-mail…" /></Field>
            <Field label="Ville"><input className="champ" value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} /></Field>
          </div>
          <Field label="Rencontré sur"><select className="champ" value={edit.platform} onChange={(e) => setEdit({ ...edit, platform: e.target.value })}><option value="">—</option>{['Vinted', 'Leboncoin', 'Facebook Marketplace', 'Vitrine MiMo', 'Main propre', 'Bouche-à-oreille'].map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Notes" hint="Ce qu'il cherche, tailles, préférences."><textarea className="champ min-h-[80px]" value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
        </div>}
      </Modal>
    </div>
  );
}
