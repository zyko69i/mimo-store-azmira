// État global persistant (IndexedDB) + photos.
import { useSyncExternalStore } from 'react';
import { get as idbGet, set as idbSet, del as idbDel, createStore } from 'idb-keyval';
import { Item, Sale, Client, Expense, Settings, DEFAULT_SETTINGS } from './domain';
import { demoData } from './demo';

export interface State { items: Item[]; sales: Sale[]; clients: Client[]; expenses: Expense[]; settings: Settings; seeded?: boolean }
const dataStore = createStore('mimo-store-azmira', 'data');
const photoStore = createStore('mimo-store-azmira-photos', 'photos');
const KEY = 'state-v1';

let state: State = { items: [], sales: [], clients: [], expenses: [], settings: DEFAULT_SETTINGS };
let ready = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let saveTimer: any;

export async function initStore() {
  try {
    const saved = (await idbGet(KEY, dataStore)) as State | undefined;
    if (saved && Array.isArray(saved.items)) {
      state = { ...saved, settings: { ...DEFAULT_SETTINGS, ...saved.settings, fees: { ...DEFAULT_SETTINGS.fees, ...(saved.settings?.fees || {}) } } };
    } else {
      state = { ...demoData(), seeded: true };
      await persist();
    }
  } catch {
    state = { ...demoData(), seeded: true };
  }
  if (!state.settings.shopKey) state.settings = { ...state.settings, shopKey: randomKey() };
  ready = true; emit();
}
function randomKey() { const a = new Uint8Array(24); crypto.getRandomValues(a); return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join(''); }
async function persist() { try { await idbSet(KEY, state, dataStore); } catch (e) { console.warn('Sauvegarde impossible', e); } }

export function setState(fn: (s: State) => State) {
  state = fn(state); emit();
  clearTimeout(saveTimer); saveTimer = setTimeout(persist, 150);
}
export const getState = () => state;
export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => sel(state));
}
export const useReady = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => ready);

// ---------- Actions ----------
export const upsert = <K extends 'items' | 'sales' | 'clients' | 'expenses'>(key: K, row: State[K][number]) =>
  setState((s) => {
    const list = s[key] as any[]; const i = list.findIndex((x) => x.id === (row as any).id);
    const next = i >= 0 ? list.map((x, j) => (j === i ? row : x)) : [row, ...list];
    return { ...s, [key]: next };
  });
export const remove = (key: 'items' | 'sales' | 'clients' | 'expenses', id: string) =>
  setState((s) => ({ ...s, [key]: (s[key] as any[]).filter((x) => x.id !== id) }));
export const updateSettings = (patch: Partial<Settings>) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
export async function replaceAll(next: State) { state = next; emit(); await persist(); }
export async function resetDemo() { state = { ...demoData(), seeded: true, settings: { ...DEFAULT_SETTINGS, shopKey: state.settings.shopKey } }; emit(); await persist(); }
export async function clearAll() { state = { items: [], sales: [], clients: [], expenses: [], settings: { ...DEFAULT_SETTINGS, shopKey: state.settings.shopKey } }; emit(); await persist(); }

// ---------- Photos ----------
const photoCache = new Map<string, string>();
export async function savePhoto(dataUrl: string) { const id = 'ph_' + Math.random().toString(36).slice(2, 12); await idbSet(id, dataUrl, photoStore); photoCache.set(id, dataUrl); return id; }
export async function loadPhoto(id: string) {
  if (id.startsWith('/')) return '.' + id; // photo de démonstration servie par le site
  if (photoCache.has(id)) return photoCache.get(id)!;
  const v = (await idbGet(id, photoStore)) as string | undefined; if (v) photoCache.set(id, v); return v || '';
}
export async function deletePhoto(id: string) { if (id.startsWith('/')) return; photoCache.delete(id); await idbDel(id, photoStore); }

// Lecture d'une photo : orientation EXIF appliquée, côté long limité, JPEG.
export async function fileToJpeg(file: Blob, maxSide = 1600, quality = 0.86): Promise<string> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as any);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(bmp, 0, 0, w, h);
  return c.toDataURL('image/jpeg', quality);
}
export async function rotateDataUrl(src: string, dir: 1 | -1): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const c = document.createElement('canvas'); c.width = img.height; c.height = img.width;
  const ctx = c.getContext('2d')!; ctx.translate(c.width / 2, c.height / 2); ctx.rotate((dir * Math.PI) / 2); ctx.drawImage(img, -img.width / 2, -img.height / 2);
  return c.toDataURL('image/jpeg', 0.9);
}
export async function photoForUpload(id: string, maxSide = 1200) {
  const src = await loadPhoto(id); if (!src) return '';
  const blob = await (await fetch(src)).blob();
  return fileToJpeg(blob, maxSide, 0.82);
}
