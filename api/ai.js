// MiMo Store Azmira — assistante Mira (IA) sur Vercel.
// Fournisseurs compatibles OpenAI, par ordre de priorité :
//   AGNES_API_KEY · GROQ_API_KEY · OPENAI_API_KEY · Vercel AI Gateway (AI_GATEWAY_API_KEY ou OIDC Vercel)
// Aucune clé ne doit être écrite dans le code : tout passe par les variables d'environnement Vercel.
import { json, readJson, clean, rateLimited } from './_lib/http.js';

function provider(request) {
  const env = process.env;
  if (env.AGNES_API_KEY) return { name: 'Agnes AI', base: 'https://apihub.agnes-ai.com/v1', key: env.AGNES_API_KEY, model: env.AGNES_MODEL || 'agnes-3.0-flash' };
  if (env.GROQ_API_KEY) return { name: 'Groq', base: 'https://api.groq.com/openai/v1', key: env.GROQ_API_KEY, model: env.GROQ_MODEL || 'openai/gpt-oss-20b' };
  if (env.OPENAI_API_KEY) return { name: 'OpenAI', base: 'https://api.openai.com/v1', key: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || 'gpt-4.1-mini' };
  const gw = env.AI_GATEWAY_API_KEY || request.headers.get('x-vercel-oidc-token') || env.VERCEL_OIDC_TOKEN;
  if (gw) return { name: 'Vercel AI Gateway', base: 'https://ai-gateway.vercel.sh/v1', key: gw, model: env.AI_GATEWAY_MODEL || 'openai/gpt-4.1-mini' };
  return null;
}

const PERSONA = `Tu es Mira, l'assistante de MiMo Store Azmira, une boutique de revente d'occasion basée à Montélimar (vêtements, chaussures, accessoires, high-tech, outils, pièces auto et scooter).
Tu parles français, avec un ton chaleureux, direct et professionnel. Tu tutoies le vendeur.
Règles :
- Tu t'appuies uniquement sur le contexte fourni (stock, ventes, chiffres). Tu n'inventes jamais une référence, une marque, une taille ou un chiffre.
- Les chiffres exacts (CA, marge, stock) sont calculés par l'application et donnés dans le contexte : reprends-les tels quels.
- Pour les prix d'occasion en France : décote selon l'état (neuf avec étiquette ~55-70 % du neuf, très bon état ~35-50 %, bon état ~25-40 %, satisfaisant ~15-25 %, pour pièces ~5-15 %), la marque et la demande. Donne une fourchette et un prix conseillé.
- Réponses courtes (5 phrases maximum) sauf si on te demande un texte d'annonce.`;

const LISTING_RULES = `Format obligatoire de l'annonce :
1re ligne : un titre court (article + marque + taille si connues), sans emoji.
Puis 1 phrase d'accroche honnête.
Puis 3 à 4 puces commençant par « – » avec uniquement des informations vraies et fournies.
Puis une ligne « Taille : … » si la taille est connue.
Puis exactement ces deux phrases :
N'hésitez pas à prendre en lot, regardez mon profil.
Remise sur les lots : plus vous en prenez, plus la réduction est grande !
Puis 4 à 6 hashtags pertinents sur une seule ligne.
Adapte légèrement le ton à la plateforme demandée (Vinted : mode et lots ; Leboncoin : précis, remise en main propre possible ; Facebook : direct et local).`;

async function complete(p, messages, { maxTokens = 600, temperature = 0.6, jsonMode = false } = {}) {
  const body = { model: p.model, messages, max_tokens: maxTokens, temperature };
  if (jsonMode) body.response_format = { type: 'json_object' };
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await fetch(p.base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + p.key },
      body: JSON.stringify(body),
    });
    if (r.status === 429 && attempt === 0) { await new Promise((s) => setTimeout(s, 2500)); continue; }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = r.status === 429 ? 'Trop de demandes en ce moment, réessaie dans une minute.'
        : r.status === 401 || r.status === 403 ? 'La clé IA est refusée par le fournisseur.'
        : (data?.error?.message || 'Le fournisseur IA ne répond pas.');
      throw Object.assign(new Error(msg), { status: 502 });
    }
    return String(data?.choices?.[0]?.message?.content || '').trim();
  }
  throw Object.assign(new Error('Trop de demandes en ce moment, réessaie dans une minute.'), { status: 502 });
}

function describeItem(a = {}) {
  const f = [
    ['Article', a.title], ['Marque', a.brand], ['Catégorie', a.category], ['Taille', a.size], ['État', a.condition],
    ['Couleur', a.color], ['Matière', a.material], ['Détails', a.details], ['Prix affiché', a.price ? a.price + ' €' : ''],
    ["Prix d'achat", a.buyPrice ? a.buyPrice + ' €' : ''],
  ];
  return f.filter(([, v]) => clean(v)).map(([k, v]) => `${k} : ${clean(v, 300)}`).join('\n');
}

function parseJson(text) {
  const m = String(text).match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0].replace(/[“”]/g, '"').replace(/,\s*}/g, '}')); } catch { return null; }
}

export async function GET(request) {
  const p = provider(request);
  return json(200, { ok: !!p, provider: p?.name || null, model: p?.model || null });
}

export async function POST(request) {
  if (rateLimited(request, 40)) return json(429, { error: 'Trop de demandes, patiente une minute.' });
  const action = new URL(request.url).searchParams.get('action') || 'chat';
  const p = provider(request);
  if (!p) return json(503, { error: "Aucune IA n'est configurée. Ajoute AGNES_API_KEY, GROQ_API_KEY, OPENAI_API_KEY ou active Vercel AI Gateway dans les variables d'environnement du projet Vercel." });
  try {
    const body = await readJson(request);
    if (action === 'chat') {
      const history = (Array.isArray(body.messages) ? body.messages : []).slice(-12)
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
        .map((m) => ({ role: m.role, content: clean(m.content, 2000) }));
      if (!history.length) return json(400, { error: 'Message vide.' });
      const context = clean(body.context, 12000);
      const text = await complete(p, [
        { role: 'system', content: PERSONA + (context ? '\n\nContexte de la boutique (calculé par l\'application) :\n' + context : '') },
        ...history,
      ]);
      return json(200, { text, provider: p.name });
    }
    if (action === 'listing') {
      const platform = clean(body.platform, 20) || 'vinted';
      const text = await complete(p, [
        { role: 'system', content: PERSONA + '\n\n' + LISTING_RULES },
        { role: 'user', content: `Rédige l'annonce ${platform} pour cet article :\n${describeItem(body.item)}` },
      ], { maxTokens: 500, temperature: 0.5 });
      return json(200, { text, provider: p.name });
    }
    if (action === 'price') {
      const text = await complete(p, [
        { role: 'system', content: PERSONA + '\nRéponds uniquement en JSON : {"price": nombre, "low": nombre, "high": nombre, "reason": "1 à 2 phrases"}.' },
        { role: 'user', content: `Estime le prix de revente d'occasion en France :\n${describeItem(body.item)}` },
      ], { maxTokens: 250, temperature: 0.3, jsonMode: p.name !== 'Agnes AI' });
      const data = parseJson(text);
      if (!data || !Number.isFinite(+data.price)) return json(502, { error: "L'estimation n'a pas pu être lue, réessaie." });
      return json(200, { price: Math.round(+data.price), low: Math.round(+data.low || +data.price * 0.8), high: Math.round(+data.high || +data.price * 1.2), reason: clean(data.reason, 400), provider: p.name });
    }
    return json(404, { error: 'Action IA inconnue.' });
  } catch (e) {
    return json(e.status || 500, { error: e.message || 'Erreur IA.' });
  }
}
