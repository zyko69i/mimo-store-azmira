// Modèle de données et calculs métier de MiMo Store Azmira.
export type PlatformId = 'vinted' | 'leboncoin' | 'facebook' | 'vitrine';
export const PLATFORMS: { id: PlatformId; label: string; short: string; color: string }[] = [
  { id: 'vinted', label: 'Vinted', short: 'VI', color: '#09B1BA' },
  { id: 'leboncoin', label: 'Leboncoin', short: 'LB', color: '#EC5A13' },
  { id: 'facebook', label: 'Facebook Marketplace', short: 'FB', color: '#1877F2' },
  { id: 'vitrine', label: 'Vitrine MiMo', short: 'MI', color: '#A8875A' },
];
export const platformLabel = (id?: string) => PLATFORMS.find((p) => p.id === id)?.label || 'Autre';

export type Listing = { on: boolean; price?: number; url?: string; since?: string };
export type ItemStatus = 'brouillon' | 'stock' | 'en_ligne' | 'reserve' | 'vendu';
export const STATUS_LABEL: Record<ItemStatus, string> = {
  brouillon: 'Brouillon', stock: 'En stock', en_ligne: 'En ligne', reserve: 'Réservé', vendu: 'Vendu',
};

export interface Item {
  id: string; ref: string; title: string; brand: string; category: string; size: string; condition: string;
  color: string; material: string; details: string; description: string;
  buyPrice: number; price: number; floorPrice: number;
  buyDate: string; location: string; sku: string; weight: string;
  photos: string[];
  status: ItemStatus;
  platforms: Partial<Record<PlatformId, Listing>>;
  priceHistory: { date: string; price: number }[];
  views: number; favorites: number;
  createdAt: string; updatedAt: string;
}

export type SaleStatus = 'a_envoyer' | 'envoye' | 'livre' | 'paye';
export const SALE_STEPS: { id: SaleStatus; label: string }[] = [
  { id: 'a_envoyer', label: 'À envoyer' }, { id: 'envoye', label: 'Envoyé' }, { id: 'livre', label: 'Livré' }, { id: 'paye', label: 'Payé' },
];
export interface Sale {
  id: string; itemId: string; itemTitle: string; itemRef: string; date: string; platform: PlatformId | 'main_propre';
  price: number; buyPrice: number; shippingCost: number; fees: number; clientId: string; status: SaleStatus;
  handover: boolean; tracking: string; note: string;
}
export interface Client { id: string; name: string; contact: string; city: string; platform: string; notes: string; createdAt: string }
export interface Expense { id: string; date: string; label: string; category: string; amount: number }
export const EXPENSE_CATEGORIES = ['Achat de stock', 'Emballages', 'Envois', 'Transport', 'Matériel photo', 'Abonnements', 'Boosts / mise en avant', 'Autre'];

export interface Settings {
  shopName: string; tagline: string; city: string; postal: string; whatsapp: string; email: string;
  fees: Record<PlatformId, { pct: number; fixed: number }>;
  shipDays: number; staleDays: number; markdownPct: number; roundTo: number; minMarginPct: number;
  urssafRate: number; vlRate: number; vl: boolean; caThreshold: number;
  assistantName: string; shopKey: string; handover: boolean; shipping: boolean;
}
export const DEFAULT_SETTINGS: Settings = {
  shopName: 'MiMo Store Azmira', tagline: 'Pièces de seconde main choisies, vérifiées et prêtes à repartir.',
  city: 'Montélimar', postal: '26200', whatsapp: '', email: '',
  fees: { vinted: { pct: 0, fixed: 0 }, leboncoin: { pct: 0, fixed: 0 }, facebook: { pct: 0, fixed: 0 }, vitrine: { pct: 0, fixed: 0 } },
  shipDays: 5, staleDays: 21, markdownPct: 10, roundTo: 1, minMarginPct: 30,
  // Taux micro-entrepreneur 2026 (vente de marchandises) : 12,3 % ; versement libératoire 1 % ; seuil 203 100 € (service-public.fr)
  urssafRate: 12.3, vlRate: 1, vl: false, caThreshold: 203100,
  assistantName: 'Mira', shopKey: '', handover: true, shipping: true,
};

export const CATEGORY_GROUPS: { group: string; items: string[] }[] = [
  { group: 'Mode', items: ['Femme — hauts', 'Femme — bas', 'Femme — robes', 'Homme — hauts', 'Homme — bas', 'Vestes & manteaux', 'Enfant', 'Bébé', 'Chaussures', 'Sacs & bagagerie', 'Accessoires', 'Bijoux & montres', 'Sport'] },
  { group: 'Maison & loisirs', items: ['Déco', 'Cuisine', 'Livres', 'Jeux & jouets', 'Puériculture'] },
  { group: 'High-tech', items: ['Téléphonie', 'Audio', 'Informatique', 'Jeux vidéo'] },
  { group: 'Auto & moto', items: ['Outils voiture', 'Pièces auto', 'Pièces scooter / moto', 'Équipement moto'] },
  { group: 'Bricolage', items: ['Outillage', 'Jardin'] },
  { group: 'Autre', items: ['Autre'] },
];
export const CATEGORIES = CATEGORY_GROUPS.flatMap((g) => g.items);
export const CONDITIONS = ['Neuf avec étiquette', 'Neuf sans étiquette', 'Très bon état', 'Bon état', 'Satisfaisant', 'Usé (traces visibles)', 'À réparer', 'Pour pièces'];

// ---------- Utilitaires ----------
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
export const eur = (n: number, dec = 0) => (Number.isFinite(n) ? n : 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: dec, maximumFractionDigits: dec === 0 ? 0 : 2 });
export const eur2 = (n: number) => eur(n, 2);
export const pct = (n: number) => (Number.isFinite(n) ? Math.round(n) : 0) + ' %';
export const fdate = (s: string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }) => {
  if (!s) return '—'; const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('fr-FR', opts);
};
export const daysBetween = (a: string, b: string) => Math.round((new Date(b.slice(0, 10)).getTime() - new Date(a.slice(0, 10)).getTime()) / 86400000);
export const norm = (s: string) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const roundPrice = (n: number, step = 1) => Math.max(step, Math.round(n / step) * step);

// ---------- Jours fériés français et jours ouvrés ----------
function easter(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(y, month - 1, day));
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
const holidayCache = new Map<number, Set<string>>();
export function frenchHolidays(y: number) {
  if (holidayCache.has(y)) return holidayCache.get(y)!;
  const e = easter(y); const add = (n: number) => iso(new Date(e.getTime() + n * 86400000));
  const set = new Set([`${y}-01-01`, add(1), `${y}-05-01`, `${y}-05-08`, add(39), add(50), `${y}-07-14`, `${y}-08-15`, `${y}-11-01`, `${y}-11-11`, `${y}-12-25`]);
  holidayCache.set(y, set); return set;
}
export function addBusinessDays(start: string, n: number) {
  const d = new Date(start.slice(0, 10) + 'T00:00:00Z'); let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay(); if (wd === 0 || wd === 6) continue;
    if (frenchHolidays(d.getUTCFullYear()).has(iso(d))) continue;
    left--;
  }
  return iso(d);
}

// ---------- Calculs ----------
export function saleFees(s: Settings, platform: string, price: number) {
  const f = (s.fees as any)[platform]; if (!f) return 0;
  return Math.round((price * (f.pct || 0) / 100 + (f.fixed || 0)) * 100) / 100;
}
export const saleNet = (x: Sale) => x.price - x.fees - x.shippingCost;
export const saleProfit = (x: Sale) => saleNet(x) - x.buyPrice;
export const itemMargin = (i: Item) => i.price - i.buyPrice;
export const itemMarginPct = (i: Item) => (i.price > 0 ? ((i.price - i.buyPrice) / i.price) * 100 : 0);
export const listedPlatforms = (i: Item) => PLATFORMS.filter((p) => i.platforms?.[p.id]?.on).map((p) => p.id);
export function onlineSince(i: Item) {
  const dates = listedPlatforms(i).map((p) => i.platforms[p]?.since).filter(Boolean) as string[];
  return dates.sort()[0] || '';
}
export function shipDeadline(s: Settings, sale: Sale) { return addBusinessDays(sale.date, s.shipDays); }

export function nextRef(items: Item[]) {
  const max = items.reduce((m, i) => Math.max(m, +(i.ref.match(/(\d+)$/)?.[1] || 0)), 0);
  return 'MS-' + String(max + 1).padStart(4, '0');
}

export function blankItem(items: Item[], s: Settings): Item {
  const now = new Date().toISOString();
  return {
    id: uid(), ref: nextRef(items), title: '', brand: '', category: '', size: '', condition: '', color: '', material: '', details: '', description: '',
    buyPrice: 0, price: 0, floorPrice: 0, buyDate: todayISO(), location: '', sku: '', weight: '', photos: [], status: 'stock',
    platforms: {}, priceHistory: [], views: 0, favorites: 0, createdAt: now, updatedAt: now,
  };
}

// Repère de prix hors-ligne (sans IA) : prix d'achat, état et catégorie.
const COND_FACTOR: Record<string, number> = { 'Neuf avec étiquette': 2.6, 'Neuf sans étiquette': 2.3, 'Très bon état': 2.0, 'Bon état': 1.8, 'Satisfaisant': 1.5, 'Usé (traces visibles)': 1.3, 'À réparer': 1.2, 'Pour pièces': 1.1 };
export function offlinePriceHint(i: Partial<Item>, s: Settings) {
  const buy = +(i.buyPrice || 0); if (!buy) return null;
  const f = COND_FACTOR[i.condition || ''] || 1.8;
  const minByMargin = buy / (1 - s.minMarginPct / 100);
  const price = roundPrice(Math.max(buy * f, minByMargin), s.roundTo || 1);
  return { price, low: roundPrice(Math.max(minByMargin, price * 0.8), s.roundTo || 1), high: roundPrice(price * 1.25, s.roundTo || 1) };
}

// Article qui « traîne » : en ligne depuis plus de staleDays sans vente.
export function staleInfo(i: Item, s: Settings, today = todayISO()) {
  if (i.status === 'vendu' || i.status === 'brouillon') return null;
  const since = onlineSince(i); if (!since) return null;
  const days = daysBetween(since, today);
  const lastChange = i.priceHistory.length ? i.priceHistory[i.priceHistory.length - 1].date : since;
  const sinceChange = daysBetween(lastChange, today);
  if (days < s.staleDays || sinceChange < Math.min(7, s.staleDays)) return { days, stale: false, suggested: 0 };
  const suggested = Math.max(i.floorPrice || 0, roundPrice(i.price * (1 - s.markdownPct / 100), s.roundTo || 1));
  return { days, stale: suggested < i.price, suggested };
}
