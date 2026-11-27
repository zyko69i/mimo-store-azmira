import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ShoppingBag, X, Minus, MessageCircle, Mail, MapPin, Search } from 'lucide-react';
import { useStore } from '../lib/store';
import { eur, norm } from '../lib/domain';
import { Photo, Modal } from '../components/ui';

type P = { id: string; ref: string; title: string; brand: string; category: string; size: string; condition: string; color: string; description: string; price: number; photos: string[] };
type Shop = { name: string; city: string; tagline: string; whatsapp: string; email: string; handover: boolean; shipping: boolean };

function Img({ src, local, alt, className }: { src?: string; local: boolean; alt: string; className: string }) {
  if (local) return <Photo id={src} alt={alt} className={className} fallback={alt[0]} />;
  return src ? <img src={'/api/shop?photo=' + encodeURIComponent(src)} alt={alt} className={`${className} object-cover bg-creme`} loading="lazy" /> : <div className={`${className} bg-or-clair grid place-items-center font-display text-[32px] text-or-fonce`}>{alt[0]}</div>;
}

export default function Boutique() {
  const { items, settings } = useStore((s) => s);
  const [remote, setRemote] = useState<{ shop: Shop; items: P[] } | null | undefined>(undefined);
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<P | null>(null);
  const [cart, setCart] = useState<string[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    document.title = settings.shopName + ' — Vitrine';
    fetch('/api/shop').then((r) => (r.ok && (r.headers.get('content-type') || '').includes('json') ? r.json() : null)).then((d) => setRemote(d?.published && d.items?.length ? d : null)).catch(() => setRemote(null));
    return () => { document.title = 'MiMo Store Azmira'; };
  }, []);
  const local = remote === null;
  const shop: Shop = remote?.shop || { name: settings.shopName, city: settings.city, tagline: settings.tagline, whatsapp: settings.whatsapp, email: settings.email, handover: settings.handover, shipping: settings.shipping };
  const products: P[] = useMemo(() => remote ? remote.items : items.filter((i) => i.status !== 'vendu' && i.platforms.vitrine?.on).map((i) => ({ ...i, description: i.description || i.details, price: i.platforms.vitrine?.price || i.price })), [remote, items]);
  const cats = [...new Set(products.map((p) => p.category).filter(Boolean))];
  const list = products.filter((p) => (!cat || p.category === cat) && (!q || norm([p.title, p.brand, p.size, p.color].join(' ')).includes(norm(q))));
  const inCart = products.filter((p) => cart.includes(p.id));
  const total = inCart.reduce((a, p) => a + p.price, 0);

  const message = () => [`Bonjour, je suis intéressé(e) par ${inCart.length > 1 ? 'ces articles' : 'cet article'} de ${shop.name} :`, ...inCart.map((p) => `- ${p.title}${p.size ? ' (T. ' + p.size + ')' : ''} — ${eur(p.price)} [${p.ref}]`), `Total : ${eur(total)}`, inCart.length > 1 ? 'Une remise lot est-elle possible ?' : '', 'Merci !'].filter(Boolean).join('\n');
  const wa = shop.whatsapp ? `https://wa.me/${shop.whatsapp.replace(/[^\d]/g, '').replace(/^0/, '33')}?text=${encodeURIComponent(message())}` : '';
  const mail = shop.email ? `mailto:${shop.email}?subject=${encodeURIComponent('Commande ' + shop.name)}&body=${encodeURIComponent(message())}` : '';

  return (
    <div className="min-h-screen bg-papier">
      <header className="sticky top-0 z-30 bg-papier/90 backdrop-blur border-b border-trait">
        <div className="mx-auto max-w-[1180px] flex items-center gap-3 px-4 sm:px-6 h-[64px]">
          <div className="flex-1 leading-none"><p className="font-display text-[26px]">{shop.name}</p></div>
          <button className="btn-encre btn-sm relative" onClick={() => setCartOpen(true)} data-testid="cart-open" aria-label={`Panier, ${cart.length} article${cart.length > 1 ? 's' : ''}`}><ShoppingBag size={16} /> Panier <span className="num">{cart.length}</span></button>
        </div>
      </header>
      <section className="mx-auto max-w-[1180px] px-4 sm:px-6 pt-10 pb-6">
        <p className="surtitre flex items-center gap-1.5"><MapPin size={13} /> {shop.city}{shop.handover && ' · remise en main propre'}{shop.shipping && ' · envoi en France'}</p>
        <h1 className="font-display text-[44px] sm:text-[60px] leading-[0.95] mt-3 max-w-3xl">{shop.tagline}</h1>
        {local && remote === null && <p className="mt-4 text-[13px] text-gris">Aperçu de la vitrine enregistrée sur cet appareil.</p>}
      </section>
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 flex flex-wrap items-center gap-2 pb-5">
        <button className={`pastille !text-[13px] !px-3 !py-1.5 ${!cat ? 'bg-encre text-creme' : 'bg-encre/5'}`} onClick={() => setCat('')}>Tout ({products.length})</button>
        {cats.map((c) => <button key={c} className={`pastille !text-[13px] !px-3 !py-1.5 ${cat === c ? 'bg-encre text-creme' : 'bg-encre/5'}`} onClick={() => setCat(c)}>{c}</button>)}
        <label className="relative ml-auto w-full sm:w-64"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gris" /><input className="champ !pl-9" placeholder="Rechercher" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher dans la vitrine" /></label>
      </div>
      <main className="mx-auto max-w-[1180px] px-4 sm:px-6 pb-24">
        {remote === undefined ? <p className="text-gris">Chargement…</p> : !list.length ? <p className="py-16 text-center text-gris">Aucun article pour le moment.</p> : (
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
            {list.map((p) => (
              <li key={p.id}>
                <button className="group block w-full text-left" onClick={() => { setOpen(p); setPhotoIdx(0); }} data-testid={`shop-item-${p.id}`}>
                  <Img src={p.photos[0]} local={local} alt={p.title} className="aspect-[4/5] w-full rounded transition-transform group-hover:scale-[1.01]" />
                  <p className="mt-2.5 text-[14px] font-medium leading-snug">{p.title}</p>
                  <p className="text-[13px] text-gris">{[p.brand, p.size && 'T. ' + p.size].filter(Boolean).join(' · ')}</p>
                  <p className="mt-1 font-semibold num">{eur(p.price)}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
      <footer className="border-t border-trait py-8 text-center text-[13px] text-gris">{shop.name} · {shop.city} · <Link href="/" className="underline">Espace vendeur</Link></footer>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.title || ''} wide footer={open && <button className="btn-encre" data-testid="add-cart" disabled={cart.includes(open.id)} onClick={() => { setCart((c) => [...c, open.id]); setOpen(null); setCartOpen(true); }}>{cart.includes(open.id) ? 'Déjà dans le panier' : `Ajouter au panier · ${eur(open.price)}`}</button>}>
        {open && <div className="grid sm:grid-cols-2 gap-5">
          <div><Img src={open.photos[photoIdx]} local={local} alt={open.title} className="aspect-[4/5] w-full rounded" />
            {open.photos.length > 1 && <div className="mt-2 flex gap-2">{open.photos.map((ph, i) => <button key={ph} onClick={() => setPhotoIdx(i)} aria-label={`Photo ${i + 1}`} className={`rounded overflow-hidden ring-2 ${i === photoIdx ? 'ring-encre' : 'ring-transparent'}`}><Img src={ph} local={local} alt={open.title} className="h-14 w-12" /></button>)}</div>}</div>
          <div className="space-y-3">
            <p className="font-display text-[34px] num">{eur(open.price)}</p>
            <dl className="grid grid-cols-[90px_1fr] gap-y-1.5 text-[14px]">{([['Marque', open.brand], ['Taille', open.size], ['État', open.condition], ['Couleur', open.color], ['Réf.', open.ref]] as [string, string][]).filter(([, v]) => v).map(([k, v]) => <div key={k} className="contents"><dt className="text-gris">{k}</dt><dd>{v}</dd></div>)}</dl>
            {open.description && <p className="text-[14px] whitespace-pre-line text-gris">{open.description}</p>}
          </div>
        </div>}
      </Modal>
      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title="Ton panier" footer={inCart.length > 0 && <>
        {wa && <a className="btn-encre" href={wa} target="_blank" rel="noreferrer" data-testid="order-wa"><MessageCircle size={16} /> Commander sur WhatsApp</a>}
        {mail && <a className="btn-ligne" href={mail} data-testid="order-mail"><Mail size={16} /> Par e-mail</a>}
        {!wa && !mail && <p className="text-[13px] text-terre">Le vendeur n'a pas encore indiqué de contact.</p>}
      </>}>
        {!inCart.length ? <p className="text-gris">Ton panier est vide.</p> : <ul className="divide-y divide-trait">
          {inCart.map((p) => <li key={p.id} className="flex items-center gap-3 py-2.5"><Img src={p.photos[0]} local={local} alt={p.title} className="h-14 w-12 rounded" /><span className="flex-1 min-w-0"><span className="block truncate font-medium">{p.title}</span><span className="text-[13px] text-gris num">{eur(p.price)}</span></span><button className="btn-ligne btn-sm !px-2.5" onClick={() => setCart((c) => c.filter((x) => x !== p.id))} aria-label={`Retirer ${p.title}`}><Minus size={15} /></button></li>)}
          <li className="flex justify-between pt-3 font-semibold"><span>Total</span><span className="num">{eur(total)}</span></li>
          {inCart.length > 1 && <li className="pt-2 text-[13px] text-gris">Remise possible sur les lots : demande-la dans ton message.</li>}
        </ul>}
      </Modal>
    </div>
  );
}
