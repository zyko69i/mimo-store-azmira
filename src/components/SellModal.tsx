import { useEffect, useState } from 'react';
import { Modal, Field, useToast } from './ui';
import { useStore, upsert } from '../lib/store';
import { Item, PLATFORMS, Sale, todayISO, uid, saleFees, eur2, addBusinessDays, fdate, listedPlatforms } from '../lib/domain';

export default function SellModal({ item, onClose }: { item: Item | null; onClose: () => void }) {
  const { clients, settings } = useStore((s) => s);
  const toast = useToast();
  const first = item ? (listedPlatforms(item)[0] || 'vinted') : 'vinted';
  const [f, setF] = useState({ platform: first as string, price: 0, date: todayISO(), shipping: 0, clientId: '', newClient: '', handover: false });
  useEffect(() => { if (item) setF({ platform: first, price: item.platforms?.[first as 'vinted']?.price || item.price, date: todayISO(), shipping: 0, clientId: '', newClient: '', handover: false }); }, [item?.id]);
  if (!item) return null;
  const fees = f.platform === 'main_propre' ? 0 : saleFees(settings, f.platform, +f.price);
  const net = +f.price - fees - +f.shipping;
  const profit = net - item.buyPrice;
  const others = listedPlatforms(item).filter((p) => p !== f.platform);

  const save = () => {
    if (!(+f.price > 0)) return toast('Indique le prix de vente.', 'warn');
    let clientId = f.clientId;
    if (!clientId && f.newClient.trim()) {
      clientId = uid();
      upsert('clients', { id: clientId, name: f.newClient.trim(), contact: '', city: '', platform: PLATFORMS.find((p) => p.id === f.platform)?.label || 'Main propre', notes: '', createdAt: new Date().toISOString() });
    }
    const sale: Sale = {
      id: uid(), itemId: item.id, itemTitle: `${item.title}${item.brand ? ' ' + item.brand : ''}`, itemRef: item.ref, date: f.date, platform: f.platform as Sale['platform'],
      price: +f.price, buyPrice: item.buyPrice, shippingCost: +f.shipping, fees, clientId, status: f.handover || f.platform === 'main_propre' ? 'paye' : 'a_envoyer',
      handover: f.handover || f.platform === 'main_propre', tracking: '', note: '',
    };
    upsert('sales', sale);
    const platforms = { ...item.platforms }; if ((platforms as any)[f.platform]) (platforms as any)[f.platform] = { ...(platforms as any)[f.platform], on: false };
    upsert('items', { ...item, status: 'vendu', platforms, updatedAt: new Date().toISOString() });
    toast(others.length ? `Vendu. Pense à retirer l'annonce sur ${others.map((p) => PLATFORMS.find((x) => x.id === p)?.label).join(', ')}.` : 'Vente enregistrée.');
    onClose();
  };
  const set = (k: string, v: any) => setF((x) => ({ ...x, [k]: v }));

  return (
    <Modal open onClose={onClose} title="Enregistrer la vente"
      footer={<><button className="btn-ligne" onClick={onClose}>Annuler</button><button className="btn-encre" data-testid="sell-save" onClick={save}>Valider la vente</button></>}>
      <p className="text-[14px] text-gris mb-4">{item.ref} · {item.title} {item.brand}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vendu sur">
          <select className="champ" value={f.platform} onChange={(e) => set('platform', e.target.value)} data-testid="sell-platform">
            {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}<option value="main_propre">Main propre / autre</option>
          </select>
        </Field>
        <Field label="Prix de vente (€)"><input className="champ num" type="number" inputMode="decimal" min="0" step="0.5" value={f.price} onChange={(e) => set('price', e.target.value)} data-testid="sell-price" /></Field>
        <Field label="Date"><input className="champ" type="date" value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>
        <Field label="Port à ta charge (€)"><input className="champ num" type="number" inputMode="decimal" min="0" step="0.1" value={f.shipping} onChange={(e) => set('shipping', e.target.value)} /></Field>
        <Field label="Client" className="col-span-2">
          <select className="champ" value={f.clientId} onChange={(e) => set('clientId', e.target.value)}>
            <option value="">— Nouveau client ou aucun —</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        {!f.clientId && <Field label="Nom du nouveau client (facultatif)" className="col-span-2"><input className="champ" value={f.newClient} onChange={(e) => set('newClient', e.target.value)} placeholder="Ex. Sarah L." /></Field>}
        <label className="col-span-2 flex items-center gap-3 min-h-[44px]"><input type="checkbox" className="h-5 w-5 accent-[#A8875A]" checked={f.handover} onChange={(e) => set('handover', e.target.checked)} /> Remise en main propre (déjà payé, pas d'envoi)</label>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-md bg-creme p-3 text-[13px]">
        <div><dt className="text-gris">Frais plateforme</dt><dd className="num font-semibold">{eur2(fees)}</dd></div>
        <div><dt className="text-gris">Net encaissé</dt><dd className="num font-semibold">{eur2(net)}</dd></div>
        <div><dt className="text-gris">Bénéfice</dt><dd className={`num font-semibold ${profit >= 0 ? 'text-sauge' : 'text-terre'}`}>{eur2(profit)}</dd></div>
      </dl>
      {!f.handover && f.platform !== 'main_propre' && <p className="mt-3 text-[13px] text-gris">À envoyer avant le <strong className="text-encre">{fdate(addBusinessDays(f.date, settings.shipDays), { weekday: 'long', day: 'numeric', month: 'long' })}</strong> ({settings.shipDays} jours ouvrés, week-ends et jours fériés exclus).</p>}
      {others.length > 0 && <p className="mt-2 text-[13px] text-terre">Encore en ligne sur : {others.map((p) => PLATFORMS.find((x) => x.id === p)?.label).join(', ')}. Retire ces annonces après la vente.</p>}
    </Modal>
  );
}
