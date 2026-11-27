import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { ExternalLink, Upload, Copy, EyeOff } from 'lucide-react';
import { useStore, upsert, photoForUpload } from '../lib/store';
import { eur, fdate } from '../lib/domain';
import { Photo, initials, useToast, Empty, copyText } from '../components/ui';

export const publicPhotoId = (p: string) => (p.startsWith('/') ? 'demo-' + p.split('/').pop()!.replace(/\.[a-z]+$/i, '').replace(/[^a-zA-Z0-9_-]/g, '') : p);

export default function Vitrine() {
  const { items, settings } = useStore((s) => s);
  const toast = useToast();
  const [busy, setBusy] = useState('');
  const [remote, setRemote] = useState<{ configured: boolean; published?: boolean; updatedAt?: string; count?: number; error?: string } | null>(null);
  const shown = items.filter((i) => i.status !== 'vendu' && i.platforms.vitrine?.on);
  const candidates = items.filter((i) => i.status !== 'vendu' && i.status !== 'brouillon' && !i.platforms.vitrine?.on);
  const url = location.origin + location.pathname + '#/boutique';

  const check = async () => {
    try {
      const r = await fetch('/api/shop'); const isJson = (r.headers.get('content-type') || '').includes('json');
      const d = isJson ? await r.json().catch(() => ({})) : {};
      if (r.status === 503) setRemote({ configured: false, error: d.error });
      else if (!r.ok || !isJson) setRemote({ configured: false, error: "Le serveur de la vitrine n'est pas joignable ici (fonctionne une fois déployé sur Vercel)." });
      else setRemote({ configured: true, published: !!d.published, updatedAt: d.updatedAt, count: d.items?.length || 0 });
    } catch { setRemote({ configured: false, error: "Le serveur de la vitrine n'est pas joignable." }); }
  };
  useEffect(() => { check(); }, []);

  const toggle = (id: string, on: boolean) => {
    const it = items.find((i) => i.id === id); if (!it) return;
    upsert('items', { ...it, status: on && it.status === 'stock' ? 'en_ligne' : it.status, platforms: { ...it.platforms, vitrine: { on, since: on ? new Date().toISOString().slice(0, 10) : undefined, price: it.price } }, updatedAt: new Date().toISOString() });
  };

  const post = async (body: any) => {
    const r = await fetch('/api/shop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(d.error || `Erreur ${r.status}`), { status: r.status }); return d;
  };
  const publish = async () => {
    setBusy('Préparation…');
    try {
      const out = [];
      let n = 0; const total = shown.reduce((a, i) => a + Math.min(5, i.photos.length), 0);
      for (const it of shown) {
        const ids: string[] = [];
        for (const p of it.photos.slice(0, 5)) {
          n++; setBusy(`Photos ${n}/${total}…`);
          const data = await photoForUpload(p); if (!data) continue;
          const id = publicPhotoId(p); await post({ key: settings.shopKey, photo: { id, data } }); ids.push(id);
        }
        out.push({ id: it.id, ref: it.ref, title: it.title, brand: it.brand, category: it.category, size: it.size, condition: it.condition, color: it.color, description: it.description || it.details, price: it.platforms.vitrine?.price || it.price, photos: ids });
      }
      setBusy('Catalogue…');
      const d = await post({ key: settings.shopKey, shop: { name: settings.shopName, city: settings.city, tagline: settings.tagline, whatsapp: settings.whatsapp, email: settings.email, handover: settings.handover, shipping: settings.shipping }, items: out });
      toast(`Vitrine publiée : ${d.count} article${d.count > 1 ? 's' : ''}.`); check();
    } catch (e: any) { toast(e.message, 'warn'); if (e.status === 503 || e.status === 404) check(); }
    setBusy('');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="surtitre">Boutique en ligne</p><h1 className="titre-page mt-2">Ta vitrine MiMo</h1><p className="mt-2 text-gris max-w-2xl">Une page publique à partager (bio Instagram, statut WhatsApp, QR code en brocante). Les clients choisissent, puis t'envoient leur commande sur WhatsApp ou par e-mail.</p></div>
        <div className="flex flex-wrap gap-2">
          <Link href="/boutique" className="btn-ligne" data-testid="see-shop"><ExternalLink size={16} /> Voir la vitrine</Link>
          <button className="btn-encre" onClick={publish} disabled={!!busy || !shown.length} data-testid="publish"><Upload size={16} /> {busy || 'Publier la vitrine'}</button>
        </div>
      </div>
      <section className="carte p-5 space-y-2">
        <h2 className="text-[16px] font-semibold">État de la publication</h2>
        {!remote ? <p className="text-gris text-[14px]">Vérification…</p> : remote.configured ? (
          <p className="text-[14px]">{remote.published ? <>En ligne · {remote.count} article{(remote.count || 0) > 1 ? 's' : ''} · mise à jour le {fdate(remote.updatedAt || '', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</> : 'Stockage prêt, vitrine jamais publiée.'}</p>
        ) : (
          <div className="rounded-md bg-or-clair/50 p-3 text-[14px]"><p className="font-semibold text-or-fonce">Vitrine en ligne pas encore activée</p><p className="mt-1 text-gris">{remote.error} En attendant, la vitrine affiche les articles enregistrés sur cet appareil.</p></div>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1"><code className="rounded bg-creme px-2 py-1 text-[13px] break-all">{url}</code><button className="btn-ligne btn-sm" onClick={async () => (await copyText(url)) && toast('Lien copié.')}><Copy size={14} /> Copier le lien</button></div>
        {!settings.whatsapp && !settings.email && <p className="text-[13px] text-terre">Ajoute un numéro WhatsApp ou un e-mail dans <Link href="/reglages" className="underline">Réglages</Link> pour recevoir les commandes.</p>}
      </section>
      <section>
        <h2 className="text-[16px] font-semibold mb-3">En vitrine ({shown.length})</h2>
        {!shown.length ? <Empty title="Vitrine vide" text="Ajoute des articles ci-dessous ou coche « Vitrine MiMo » dans une fiche." /> : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {shown.map((i) => (
              <li key={i.id} className="carte overflow-hidden">
                <Photo id={i.photos[0]} alt={i.title} className="aspect-[4/5] w-full" fallback={initials(i)} />
                <div className="p-3"><p className="text-[14px] font-medium truncate">{i.title}</p><p className="text-[13px] num">{eur(i.price)}</p>
                  <button className="mt-2 btn-ligne btn-sm w-full" onClick={() => toggle(i.id, false)}><EyeOff size={14} /> Retirer</button></div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {candidates.length > 0 && (
        <section className="carte p-5">
          <h2 className="text-[16px] font-semibold">À ajouter</h2>
          <ul className="mt-3 divide-y divide-trait">
            {candidates.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-2">
                <Photo id={i.photos[0]} alt="" className="h-11 w-11 rounded" fallback={initials(i)} />
                <span className="flex-1 min-w-0 truncate text-[14px]">{i.title} <span className="text-gris num">· {eur(i.price)}</span></span>
                <button className="btn-doux btn-sm" onClick={() => toggle(i.id, true)} data-testid={`vit-add-${i.id}`}>Ajouter</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
