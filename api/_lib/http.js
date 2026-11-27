// Utilitaires communs aux fonctions Vercel (format Web Request / Response).
export const json = (status, body, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
  });

export async function readJson(request, max = 2_000_000) {
  const raw = await request.text();
  if (raw.length > max) throw Object.assign(new Error('Requête trop volumineuse.'), { status: 413 });
  try { return raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error('JSON invalide.'), { status: 400 }); }
}

export const clean = (v, max = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// Limite de débit simple, en mémoire (par instance de fonction).
const hits = new Map();
export function rateLimited(request, max = 30, windowMs = 60_000) {
  const ip = (request.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  const now = Date.now();
  const rec = hits.get(ip) || { start: now, n: 0 };
  if (now - rec.start > windowMs) { rec.start = now; rec.n = 0; }
  rec.n += 1; hits.set(ip, rec);
  return rec.n > max;
}
