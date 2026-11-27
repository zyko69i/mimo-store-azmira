// Génération d'annonces sans IA (modèle fixe), et appel IA facultatif.
import { Item, PlatformId, Settings } from './domain';

export const CLOSING = "N'hésitez pas à prendre en lot, regardez mon profil.\nRemise sur les lots : plus vous en prenez, plus la réduction est grande !";
const HASH: Record<string, string[]> = {
  Chaussures: ['#sneakers', '#chaussures'], 'Vestes & manteaux': ['#veste', '#manteau'], 'Sacs & bagagerie': ['#sac', '#maroquinerie'],
  'Bijoux & montres': ['#montre', '#vintage'], Audio: ['#hifi', '#casque'], 'Outils voiture': ['#garage', '#outillage'],
  'Pièces scooter / moto': ['#scooter', '#pieces'], 'Femme — robes': ['#robe', '#modefemme'], Enfant: ['#modeenfant'], 'Jeux vidéo': ['#gaming', '#switch'],
};
const tag = (s: string) => '#' + s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

export function titleFor(i: Item) {
  return [i.title, i.brand && !i.title.toLowerCase().includes(i.brand.toLowerCase()) ? i.brand : '', i.size && i.size !== 'Unique' ? 'T. ' + i.size : ''].filter(Boolean).join(' · ');
}

export function offlineListing(i: Item, platform: PlatformId, s: Settings) {
  const lines: string[] = [titleFor(i)];
  const hook = platform === 'leboncoin'
    ? `${i.title}${i.brand ? ' ' + i.brand : ''} en ${i.condition ? i.condition.toLowerCase() : 'état décrit ci-dessous'}, à récupérer à ${s.city} ou envoyé soigneusement.`
    : platform === 'facebook'
      ? `Dispo tout de suite à ${s.city} : ${i.title.toLowerCase()}${i.brand ? ' ' + i.brand : ''}.`
      : `${i.title}${i.brand ? ' ' + i.brand : ''}, une belle pièce à petit prix.`;
  lines.push(hook, '');
  const bullets = [
    i.condition && `– État : ${i.condition}`, i.color && `– Couleur : ${i.color}`, i.material && `– Matière : ${i.material}`,
    i.details && `– ${i.details.charAt(0).toUpperCase() + i.details.slice(1)}`,
    platform === 'leboncoin' && s.handover && `– Remise en main propre possible à ${s.city}`,
  ].filter(Boolean).slice(0, 4) as string[];
  lines.push(...bullets);
  if (i.size && i.size !== 'Unique') lines.push('', `Taille : ${i.size}`);
  lines.push('', CLOSING, '');
  const tags = [...new Set([i.brand && tag(i.brand), ...(HASH[i.category] || []), '#seconde main', '#occasion', tag(s.city)].filter(Boolean).map((t) => String(t).replace(/\s/g, '')))].slice(0, 6);
  lines.push(tags.join(' '));
  return lines.join('\n');
}

// Garde-fou : une seule phrase de fin, jamais en double.
export function cleanListing(text: string) {
  let t = String(text || '').replace(/\r/g, '').trim();
  CLOSING.split('\n').forEach((line) => { t = t.split(line).join(''); });
  t = t.replace(/\n{3,}/g, '\n\n').trim();
  const parts = t.split('\n'); const last = parts[parts.length - 1] || '';
  if (/^#/.test(last.trim())) { parts.pop(); return [parts.join('\n').trim(), '', CLOSING, '', last.trim()].join('\n'); }
  return [t, '', CLOSING].join('\n');
}

export async function api<T = any>(path: string, body?: any): Promise<T> {
  const r = await fetch(path, body === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Le serveur ne répond pas (' + r.status + ').');
  return data as T;
}
