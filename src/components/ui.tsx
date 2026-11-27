import { ReactNode, useEffect, useRef, useState, createContext, useContext, useCallback } from 'react';
import { X, ImageOff, Check, AlertTriangle } from 'lucide-react';
import { loadPhoto } from '../lib/store';
import { Item, PLATFORMS, STATUS_LABEL, ItemStatus } from '../lib/domain';

export function Photo({ id, alt, className = '', fallback }: { id?: string; alt: string; className?: string; fallback?: string }) {
  const [src, setSrc] = useState(id && id.startsWith('/') ? id : '');
  useEffect(() => { let on = true; if (id) loadPhoto(id).then((s) => on && setSrc(s)); else setSrc(''); return () => { on = false; }; }, [id]);
  if (!src) return (
    <div className={`flex items-center justify-center bg-or-clair/50 text-or-fonce ${className}`} aria-label={alt} role="img">
      {fallback ? <span className="font-display text-3xl">{fallback}</span> : <ImageOff size={20} aria-hidden />}
    </div>
  );
  return <img src={src} alt={alt} loading="lazy" decoding="async" className={`object-cover ${className}`} />;
}
export const initials = (i: Pick<Item, 'title' | 'brand'>) => ((i.brand || i.title || '?').trim()[0] || '?').toUpperCase();

export function Modal({ open, onClose, title, children, wide, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return; const prev = document.activeElement as HTMLElement | null;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus(), 30);
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; prev?.focus?.(); };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-encre/40 p-0 sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={`w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} max-h-[92vh] flex flex-col bg-papier rounded-t-lg sm:rounded-lg shadow-flot`}>
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-trait">
          <h2 className="font-display text-[24px] leading-none">{title}</h2>
          <button className="btn-ligne btn-sm !min-h-[40px] !px-2" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-trait flex flex-wrap justify-end gap-2 pb-[max(12px,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

type ConfirmOpts = { title: string; message: string; confirm?: string; danger?: boolean };
const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false);
type Toast = { id: number; text: string; tone: 'ok' | 'warn' };
const ToastCtx = createContext<(text: string, tone?: 'ok' | 'warn') => void>(() => {});
export const useConfirm = () => useContext(ConfirmCtx);
export const useToast = () => useContext(ToastCtx);

export function Providers({ children }: { children: ReactNode }) {
  const [c, setC] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setC({ ...o, resolve })), []);
  const toast = useCallback((text: string, tone: 'ok' | 'warn' = 'ok') => {
    const id = Date.now() + Math.random(); setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  const close = (v: boolean) => { c?.resolve(v); setC(null); };
  return (
    <ConfirmCtx.Provider value={confirm}>
      <ToastCtx.Provider value={toast}>
        {children}
        <Modal open={!!c} onClose={() => close(false)} title={c?.title || ''}
          footer={<><button className="btn-ligne" onClick={() => close(false)}>Annuler</button><button data-testid="confirm-ok" className={c?.danger ? 'btn bg-terre text-white hover:bg-[#8e4126]' : 'btn-encre'} onClick={() => close(true)}>{c?.confirm || 'Confirmer'}</button></>}>
          <p className="text-[15px] leading-relaxed text-gris">{c?.message}</p>
        </Modal>
        <div className="fixed z-[60] left-1/2 -translate-x-1/2 bottom-[max(20px,env(safe-area-inset-bottom))] flex flex-col gap-2 items-center pointer-events-none" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto flex items-center gap-2 rounded-md bg-encre text-creme px-4 py-3 text-sm shadow-flot">
              {t.tone === 'ok' ? <Check size={16} className="text-or-clair" /> : <AlertTriangle size={16} className="text-[#F0B38F]" />}{t.text}
            </div>
          ))}
        </div>
      </ToastCtx.Provider>
    </ConfirmCtx.Provider>
  );
}

export function Field({ label, children, hint, className = '' }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return <label className={`block ${className}`}><span className="etiquette">{label}</span>{children}{hint && <span className="block mt-1 text-[12px] text-gris">{hint}</span>}</label>;
}

export function PlatformDots({ item, size = 'sm' }: { item: Item; size?: 'sm' | 'md' }) {
  return (
    <div className="flex items-center gap-1" aria-label="Plateformes">
      {PLATFORMS.map((p) => {
        const on = item.platforms?.[p.id]?.on;
        return (
          <span key={p.id} title={`${p.label} : ${on ? 'en ligne' : 'non publié'}`}
            className={`inline-flex items-center justify-center rounded-sm font-bold ${size === 'md' ? 'h-6 px-1.5 text-[11px]' : 'h-5 px-1 text-[10px]'} ${on ? 'text-white' : 'text-gris/50 bg-encre/5'}`}
            style={on ? { background: p.color } : undefined}>{p.short}</span>
        );
      })}
    </div>
  );
}

const STATUS_STYLE: Record<ItemStatus, string> = {
  brouillon: 'bg-encre/5 text-gris', stock: 'bg-or-clair text-or-fonce', en_ligne: 'bg-sauge-clair text-sauge', reserve: 'bg-[#E6E2F0] text-[#4F4672]', vendu: 'bg-encre text-creme',
};
export const StatusBadge = ({ s }: { s: ItemStatus }) => <span className={`pastille ${STATUS_STYLE[s]}`}>{STATUS_LABEL[s]}</span>;

export function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="carte px-6 py-12 text-center">
      <p className="font-display text-[26px] leading-tight">{title}</p>
      <p className="mt-2 text-gris max-w-md mx-auto">{text}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'ok' | 'warn' | 'bad' }) {
  const c = tone === 'ok' ? 'text-sauge' : tone === 'bad' ? 'text-terre' : tone === 'warn' ? 'text-or-fonce' : 'text-encre';
  return (
    <div className="carte p-4">
      <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-gris">{label}</p>
      <p className={`mt-2 text-[26px] font-semibold leading-none num ${c}`}>{value}</p>
      {sub && <p className="mt-2 text-[13px] text-gris">{sub}</p>}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { v: T; l: string; n?: number }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-md bg-encre/5 p-1">
      {options.map((o) => (
        <button key={o.v} role="tab" aria-selected={value === o.v} onClick={() => onChange(o.v)}
          className={`min-h-[36px] rounded px-3 text-[13px] font-semibold transition-colors ${value === o.v ? 'bg-papier text-encre shadow-carte' : 'text-gris hover:text-encre'}`}>
          {o.l}{o.n !== undefined && <span className="ml-1.5 num text-gris">{o.n}</span>}
        </button>
      ))}
    </div>
  );
}

export async function copyText(t: string) {
  try { await navigator.clipboard.writeText(t); return true; } catch {
    const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  }
}
export function download(name: string, content: string, type = 'text/plain') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
