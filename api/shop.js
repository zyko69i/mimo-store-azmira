// MiMo Store Azmira — vitrine publique stockée dans Vercel Blob (store privé recommandé).
// GET  /api/shop            → catalogue publié (JSON)
// GET  /api/shop?photo=ID   → photo d'un article publié
// POST /api/shop            → publication (clé de boutique obligatoire, générée sur l'appareil du vendeur)
import { createHash } from 'node:crypto';
import { put, get } from '@vercel/blob';
import { json, readJson, clean, rateLimited } from './_lib/http.js';

const ACCESS = process.env.MIMO_BLOB_ACCESS === 'public' ? 'public' : 'private';
const ROOT = 'mimo-shop/';
const configured = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const sha = (s) => createHash('sha256').update('mimo-shop-v1:' + s).digest('hex');

async function readText(path) {
  const r = await get(ROOT + path, { access: ACCESS, useCache: false });
  if (!r || r.statusCode !== 200) return null;
  return await new Response(r.stream).text();
}
const write = (path, data, contentType) =>
  put(ROOT + path, data, { access: ACCESS, addRandomSuffix: false, allowOverwrite: true, contentType, cacheControlMaxAge: 60 });

export async function GET(request) {
  if (!configured()) return json(503, { error: 'La vitrine en ligne n’est pas encore activée (stockage Vercel Blob non connecté).', configured: false });
  const url = new URL(request.url);
  const photo = url.searchParams.get('photo');
  try {
    if (photo) {
      if (!/^[a-zA-Z0-9_-]{4,80}$/.test(photo)) return json(400, { error: 'Photo invalide.' });
      const r = await get(ROOT + 'photos/' + photo + '.jpg', { access: ACCESS });
      if (!r || r.statusCode !== 200) return json(404, { error: 'Photo introuvable.' });
      return new Response(r.stream, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=300' } });
    }
    const raw = await readText('catalog.json');
    if (!raw) return json(200, { configured: true, published: false, items: [] });
    return new Response(raw, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=30' } });
  } catch (e) {
    return json(500, { error: 'Lecture de la vitrine impossible.' });
  }
}

export async function POST(request) {
  if (rateLimited(request, 10)) return json(429, { error: 'Trop de publications, patiente une minute.' });
  if (!configured()) return json(503, { error: 'Connecte un stockage Vercel Blob au projet pour publier la vitrine (Storage → Create → Blob).', configured: false });
  try {
    const body = await readJson(request, 4_000_000);
    const key = clean(body.key, 100);
    if (!/^[a-f0-9]{48}$/.test(key)) return json(400, { error: 'Clé de boutique invalide.' });
    const ownerRaw = await readText('owner.json');
    if (ownerRaw) {
      if (JSON.parse(ownerRaw).hash !== sha(key)) return json(403, { error: 'Cette vitrine appartient à un autre appareil. Recopie la clé de boutique dans Réglages.' });
    } else {
      await write('owner.json', JSON.stringify({ hash: sha(key), at: new Date().toISOString() }), 'application/json');
    }
    // Photos (déjà réduites dans le navigateur) : envoyées une par une.
    if (body.photo) {
      const id = clean(body.photo.id, 80);
      const data = String(body.photo.data || '');
      if (!/^[a-zA-Z0-9_-]{4,80}$/.test(id) || !data.startsWith('data:image/jpeg;base64,')) return json(400, { error: 'Photo invalide.' });
      const bytes = Buffer.from(data.slice(23), 'base64');
      if (bytes.length > 1_500_000) return json(413, { error: 'Photo trop lourde.' });
      await write('photos/' + id + '.jpg', bytes, 'image/jpeg');
      return json(200, { ok: true, photo: id });
    }
    const shop = body.shop || {};
    const items = (Array.isArray(body.items) ? body.items : []).slice(0, 500).map((a) => ({
      id: clean(a.id, 40), ref: clean(a.ref, 20), title: clean(a.title, 120), brand: clean(a.brand, 60), category: clean(a.category, 60),
      size: clean(a.size, 30), condition: clean(a.condition, 60), color: clean(a.color, 40), description: clean(a.description, 1500),
      price: Math.max(0, Math.round(+a.price * 100) / 100 || 0), photos: (Array.isArray(a.photos) ? a.photos : []).slice(0, 5).map((p) => clean(p, 80)),
    })).filter((a) => a.id && a.title);
    const catalog = {
      published: true, configured: true, updatedAt: new Date().toISOString(),
      shop: { name: clean(shop.name, 60), city: clean(shop.city, 60), tagline: clean(shop.tagline, 160), whatsapp: clean(shop.whatsapp, 20).replace(/[^\d+]/g, ''), email: clean(shop.email, 120), handover: !!shop.handover, shipping: !!shop.shipping },
      items,
    };
    await write('catalog.json', JSON.stringify(catalog), 'application/json');
    return json(200, { ok: true, count: items.length, updatedAt: catalog.updatedAt });
  } catch (e) {
    return json(e.status || 500, { error: e.message || 'Publication impossible.' });
  }
}
