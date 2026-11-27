// Données de démonstration (remplaçables depuis Réglages).
import { Item, Sale, Client, Expense, DEFAULT_SETTINGS, todayISO, addBusinessDays } from './domain';

const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

type Seed = [string, string, string, string, string, string, number, number, string, Partial<Record<'vinted' | 'leboncoin' | 'facebook' | 'vitrine', number>>, string?, number?, number?];
// [titre, marque, catégorie, taille, état, couleur, achat, prix, photo, plateformes {id: joursEnLigne}, détails, vues, favoris]
const SEEDS: Seed[] = [
  ['Veste en jean Trucker', "Levi's", 'Vestes & manteaux', 'M', 'Très bon état', 'Bleu délavé', 12, 38, 'veste-jean', { vinted: 26, vitrine: 26 }, 'Coupe Trucker, boutons métal, aucune usure aux poignets', 184, 11],
  ['Air Max 90', 'Nike', 'Chaussures', '42', 'Bon état', 'Blanc / gris', 25, 65, 'air-max', { vinted: 9, leboncoin: 9, vitrine: 9 }, 'Semelle propre, légères marques sur le bout', 236, 19],
  ['Sac Le Pliage grand modèle', 'Longchamp', 'Sacs & bagagerie', 'Unique', 'Très bon état', 'Noir', 30, 75, 'sac-pliage', { vinted: 4, vitrine: 4 }, 'Cuir de la rabat intact, intérieur propre', 98, 14],
  ['Doudoune Nuptse 700', 'The North Face', 'Vestes & manteaux', 'L', 'Bon état', 'Noir', 60, 140, 'doudoune', { leboncoin: 32, vinted: 32, vitrine: 32 }, 'Garnissage duvet, capuche dans le col', 312, 27],
  ['Montre F-91W', 'Casio', 'Bijoux & montres', 'Unique', 'Très bon état', 'Noir', 6, 18, 'montre', { vinted: 12, vitrine: 12 }, 'Pile neuve, bracelet d’origine', 74, 6],
  ['Casque Tune 760NC', 'JBL', 'Audio', 'Unique', 'Très bon état', 'Bleu nuit', 22, 49, 'casque', { leboncoin: 15, facebook: 15, vitrine: 15 }, 'Réduction de bruit active, boîte et câble fournis', 120, 8],
  ['Cric rouleur hydraulique 2 t', 'Facom', 'Outils voiture', 'Unique', 'Bon état', 'Rouge', 35, 85, 'cric', { leboncoin: 40, facebook: 40 }, 'Levage testé, aucune fuite', 66, 3],
  ['Carénage avant Kisbee', 'Peugeot', 'Pièces scooter / moto', 'Unique', 'Satisfaisant', 'Blanc', 8, 29, '', { leboncoin: 18 }, 'Fixations intactes, petites rayures', 41, 2],
  ['Robe Gaby', 'Sézane', 'Femme — robes', '38', 'Neuf avec étiquette', 'Écru', 40, 95, 'robe', { vinted: 2, vitrine: 2 }, 'Jamais portée, étiquette présente', 52, 9],
  ['Pull marinière', 'Petit Bateau', 'Enfant', '8 ans', 'Très bon état', 'Bleu / écru', 4, 14, '', {}, 'Coton épais, pas de bouloches'],
  ['Mario Kart 8 Deluxe', 'Nintendo', 'Jeux vidéo', 'Switch', 'Très bon état', '', 18, 35, '', {}, 'Boîte d’origine, cartouche testée'],
  ['Perceuse visseuse 18 V', 'Bosch', 'Outillage', 'Unique', 'Bon état', 'Vert', 30, 65, '', {}, '2 batteries, chargeur, coffret'],
];

const SOLD: [string, string, string, number, number, string, number, number, string][] = [
  // [titre, marque, catégorie, achat, prix vente, plateforme, joursAvant, frais port payés vendeur, statut]
  ['Trench classique', 'Zara', 'Vestes & manteaux', 9, 32, 'vinted', 170, 0, 'paye'],
  ['Stan Smith', 'Adidas', 'Chaussures', 14, 42, 'vinted', 150, 0, 'paye'],
  ['Enceinte Flip 5', 'JBL', 'Audio', 25, 55, 'leboncoin', 138, 0, 'paye'],
  ['Jean 501', "Levi's", 'Homme — bas', 7, 28, 'vinted', 120, 0, 'paye'],
  ['Clé dynamométrique', 'Facom', 'Outils voiture', 20, 48, 'leboncoin', 104, 0, 'paye'],
  ['Sweat à capuche', 'Carhartt', 'Homme — hauts', 12, 39, 'vinted', 88, 0, 'paye'],
  ['Pot d’échappement 50cc', 'Polini', 'Pièces scooter / moto', 30, 70, 'leboncoin', 75, 0, 'paye'],
  ['Sac banane', 'Eastpak', 'Sacs & bagagerie', 5, 18, 'vinted', 61, 0, 'paye'],
  ['Robe portefeuille', 'Mango', 'Femme — robes', 8, 26, 'vitrine', 48, 0, 'paye'],
  ['Manette Pro', 'Nintendo', 'Jeux vidéo', 25, 45, 'facebook', 36, 0, 'paye'],
  ['Bottines Chelsea', 'Dr. Martens', 'Chaussures', 40, 89, 'vinted', 22, 0, 'paye'],
  ['Blouson aviateur', 'Schott', 'Vestes & manteaux', 55, 120, 'leboncoin', 12, 0, 'paye'],
  ['Pull col roulé', 'COS', 'Femme — hauts', 10, 34, 'vinted', 6, 0, 'livre'],
  ['Lunettes Wayfarer', 'Ray-Ban', 'Accessoires', 30, 68, 'vinted', 3, 0, 'envoye'],
  ['Écharpe en laine', 'Acne Studios', 'Accessoires', 25, 60, 'vinted', 2, 0, 'a_envoyer'],
  ['Casque intégral', 'Shark', 'Équipement moto', 45, 95, 'leboncoin', 1, 0, 'a_envoyer'],
];

export function demoData() {
  const now = new Date().toISOString();
  const items: Item[] = SEEDS.map((s, i) => {
    const [title, brand, category, size, condition, color, buy, price, photo, plats, details, views, favs] = s;
    const platforms: Item['platforms'] = {};
    let firstSince = '';
    Object.entries(plats).forEach(([p, d]) => { const since = day(-(d as number)); platforms[p as 'vinted'] = { on: true, price, since }; if (!firstSince || since < firstSince) firstSince = since; });
    const listed = Object.keys(plats).length > 0;
    const history = listed ? [{ date: firstSince, price: (s[0] === 'Doudoune Nuptse 700' ? 165 : price) }] : [];
    if (s[0] === 'Doudoune Nuptse 700') history.push({ date: day(-12), price });
    return {
      id: 'demo' + i, ref: 'MS-' + String(i + 1).padStart(4, '0'), title, brand, category, size, condition, color, material: '', details: details || '', description: '',
      buyPrice: buy, price, floorPrice: Math.round(buy * 1.4), buyDate: day(-(listed ? (Object.values(plats)[0] as number) + 4 : 3)), location: ['Étagère A1', 'Étagère A2', 'Bac B1', 'Garage'][i % 4], sku: '', weight: '',
      photos: photo ? ['/demo/' + photo + '.jpg'] : [], status: listed ? 'en_ligne' : 'stock', platforms, priceHistory: history,
      views: views || 0, favorites: favs || 0, createdAt: now, updatedAt: now,
    };
  });
  const clients: Client[] = [
    { id: 'c1', name: 'Inès R.', contact: '@ines.vintage', city: 'Lyon', platform: 'Vinted', notes: 'Achète souvent des lots de vestes', createdAt: now },
    { id: 'c2', name: 'Karim B.', contact: '06 12 34 56 78', city: 'Montélimar', platform: 'Leboncoin', notes: 'Pièces scooter, remise en main propre', createdAt: now },
    { id: 'c3', name: 'Léa M.', contact: 'lea.m@exemple.fr', city: 'Valence', platform: 'Vitrine MiMo', notes: '', createdAt: now },
  ];
  const sales: Sale[] = SOLD.map((s, i) => {
    const [title, brand, , buy, price, platform, ago, ship, status] = s;
    return {
      id: 'sale' + i, itemId: 'sold' + i, itemTitle: `${title} ${brand}`, itemRef: 'MS-' + String(100 + i), date: day(-ago), platform: platform as Sale['platform'],
      price, buyPrice: buy, shippingCost: ship, fees: 0, clientId: i % 5 === 0 ? 'c1' : i % 7 === 0 ? 'c2' : '', status: status as Sale['status'],
      handover: platform === 'leboncoin' && i % 2 === 0, tracking: status === 'envoye' ? '6A' + (12345678900 + i) : '', note: '',
    };
  });
  const expenses: Expense[] = [
    { id: 'e1', date: day(-160), label: 'Lot de vêtements — vide-grenier', category: 'Achat de stock', amount: 80 },
    { id: 'e2', date: day(-95), label: 'Cartons et papier bulle', category: 'Emballages', amount: 24.9 },
    { id: 'e3', date: day(-60), label: 'Fond photo et lampe', category: 'Matériel photo', amount: 39 },
    { id: 'e4', date: day(-30), label: 'Boost Vinted', category: 'Boosts / mise en avant', amount: 6.5 },
    { id: 'e5', date: day(-8), label: 'Essence — tournée brocantes', category: 'Transport', amount: 32 },
  ];
  return { items, sales, clients, expenses, settings: { ...DEFAULT_SETTINGS } };
}
export const _unused = { todayISO, addBusinessDays };
