import { useEffect, useState } from 'react';
import { Router, Switch, Route, Link, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { LayoutDashboard, Package, PenLine, Truck, Users, Calculator, Store, Settings as Cog, Menu, X, Sparkles, Plus } from 'lucide-react';
import { Providers } from './components/ui';
import { useReady, useStore } from './lib/store';
import Dashboard from './pages/Dashboard';
import Stock from './pages/Stock';
import ItemEditor from './pages/ItemEditor';
import Annonces from './pages/Annonces';
import Ventes from './pages/Ventes';
import Clients from './pages/Clients';
import Compta from './pages/Compta';
import Vitrine from './pages/Vitrine';
import Boutique from './pages/Boutique';
import Reglages from './pages/Reglages';
import Mira from './components/Mira';

const NAV = [
  { href: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/stock', label: 'Stock', icon: Package },
  { href: '/annonces', label: 'Annonces', icon: PenLine },
  { href: '/ventes', label: 'Ventes & envois', icon: Truck },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/compta', label: 'Comptabilité', icon: Calculator },
  { href: '/vitrine', label: 'Vitrine en ligne', icon: Store },
  { href: '/reglages', label: 'Réglages', icon: Cog },
];

function NavLinks({ onPick }: { onPick?: () => void }) {
  const [loc] = useLocation();
  const toShip = useStore((s) => s.sales.filter((x) => x.status === 'a_envoyer').length);
  return (
    <nav aria-label="Navigation principale" className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: I }) => {
        const active = href === '/' ? loc === '/' : loc.startsWith(href) || (href === '/stock' && loc.startsWith('/article'));
        return (
          <Link key={href} href={href} onClick={onPick} data-testid={`nav-${href.slice(1) || 'accueil'}`}
            className={`flex items-center gap-3 rounded-md px-3 min-h-[44px] text-[14px] font-medium transition-colors ${active ? 'bg-creme/10 text-creme' : 'text-creme/65 hover:text-creme hover:bg-creme/5'}`}
            aria-current={active ? 'page' : undefined}>
            <I size={18} strokeWidth={1.7} aria-hidden />
            <span className="flex-1">{label}</span>
            {href === '/ventes' && toShip > 0 && <span className="num rounded-sm bg-or px-1.5 text-[12px] font-bold text-white">{toShip}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  const name = useStore((s) => s.settings.shopName);
  const [first, ...rest] = name.split(' ');
  return (
    <Link href="/" className="block leading-none" aria-label={name}>
      <span className="font-display text-[28px] text-creme">{first}</span>
      <span className="block mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-or-clair/80">{rest.join(' ') || 'Studio'}</span>
    </Link>
  );
}

function Shell() {
  const [loc, navigate] = useLocation();
  const [menu, setMenu] = useState(false);
  const [chat, setChat] = useState(false);
  const title = NAV.find((n) => (n.href === '/' ? loc === '/' : loc.startsWith(n.href)))?.label || (loc.startsWith('/article') ? 'Fiche article' : '');
  useEffect(() => { window.scrollTo(0, 0); setMenu(false); setChat(false); }, [loc]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false); document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, []);

  if (loc.startsWith('/boutique')) return <Boutique />;
  return (
    <div className="min-h-screen lg:pl-[248px]">
      <a href="#contenu" onClick={(e) => { e.preventDefault(); document.getElementById('contenu')?.focus(); }} className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] btn-encre">Aller au contenu</a>
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[248px] flex-col bg-encre px-4 py-6">
        <div className="px-3 mb-8"><Brand /></div>
        <NavLinks />
        <div className="mt-auto px-3 pt-6 text-[12px] text-creme/40">Données enregistrées sur cet appareil</div>
      </aside>

      {menu && (
        <div className="lg:hidden fixed inset-0 z-40 bg-encre/50" onClick={() => setMenu(false)}>
          <aside className="absolute inset-y-0 left-0 w-[82%] max-w-[300px] bg-encre px-4 pt-[max(20px,env(safe-area-inset-top))] pb-6 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between px-3 mb-8"><Brand /><button className="text-creme/80 p-2 -mr-2" aria-label="Fermer le menu" onClick={() => setMenu(false)}><X size={22} /></button></div>
            <NavLinks onPick={() => setMenu(false)} />
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-30 bg-creme/90 backdrop-blur border-b border-trait pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-[1180px] flex items-center gap-3 px-4 sm:px-6 h-[60px]">
          <button className="lg:hidden btn-ligne !px-2.5" aria-label="Ouvrir le menu" data-testid="burger" onClick={() => setMenu(true)}><Menu size={20} /></button>
          <p className="flex-1 truncate text-[14px] font-semibold text-gris">{title}</p>
          <button className="btn-ligne btn-sm hidden sm:inline-flex" onClick={() => navigate('/article/nouveau')} data-testid="top-new"><Plus size={16} /> Nouvel article</button>
          <button className="btn-encre btn-sm" onClick={() => setChat((v) => !v)} aria-expanded={chat} data-testid="open-mira"><Sparkles size={16} className="text-or-clair" /> Mira</button>
        </div>
      </header>

      <main id="contenu" tabIndex={-1} className="mx-auto max-w-[1180px] px-4 sm:px-6 pt-6 pb-24 outline-none">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/stock" component={Stock} />
          <Route path="/article/:id">{(p) => <ItemEditor id={p.id} />}</Route>
          <Route path="/annonces">{() => <Annonces />}</Route>
          <Route path="/annonces/:id">{(p) => <Annonces id={p.id} />}</Route>
          <Route path="/ventes" component={Ventes} />
          <Route path="/clients" component={Clients} />
          <Route path="/compta" component={Compta} />
          <Route path="/vitrine" component={Vitrine} />
          <Route path="/reglages" component={Reglages} />
          <Route>
            <div className="carte p-10 text-center"><p className="font-display text-[28px]">Page introuvable</p><Link href="/" className="btn-encre mt-4">Retour au tableau de bord</Link></div>
          </Route>
        </Switch>
      </main>
      <Mira open={chat} onClose={() => setChat(false)} />
    </div>
  );
}

export default function App() {
  const ready = useReady();
  return (
    <Providers>
      <Router hook={useHashLocation}>
        {ready ? <Shell /> : <div className="min-h-screen grid place-items-center text-gris">Chargement…</div>}
      </Router>
    </Providers>
  );
}
