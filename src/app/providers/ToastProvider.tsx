import { create } from 'zustand';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { uuid } from '@/lib/uuid';
import styles from './ToastProvider.module.css';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id' | 'duration'> & { duration?: number }) => string;
  dismiss: (id: string) => void;
}

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: ({ message, variant, duration = 4000 }) => {
    const id = uuid();
    set((s) => ({ toasts: [...s.toasts, { id, message, variant, duration }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function useToast() {
  const push = useToastStore((s) => s.push);
  return {
    success: (message: string, duration?: number) =>
      push({ message, variant: 'success', duration }),
    error: (message: string, duration?: number) =>
      push({ message, variant: 'error', duration }),
    warning: (message: string, duration?: number) =>
      push({ message, variant: 'warning', duration }),
    info: (message: string, duration?: number) => push({ message, variant: 'info', duration }),
  };
}

interface ToastViewportProps {
  children?: ReactNode;
}

export function ToastViewport({ children: _ }: ToastViewportProps) {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const timers = toasts.map((t) =>
      window.setTimeout(() => dismiss(t.id), t.duration),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [toasts, dismiss]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div role="region" aria-label="Notifications" aria-live="polite" className={styles.viewport}>
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.variant === 'error' ? 'alert' : 'status'}
          className={styles.toast}
          data-variant={t.variant}
        >
          <span className={styles.icon} aria-hidden="true">
            {variantIcon(t.variant)}
          </span>
          <span className={styles.message}>{t.message}</span>
          <button
            type="button"
            className={styles.close}
            onClick={() => dismiss(t.id)}
            aria-label="Fermer la notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}

function variantIcon(v: ToastVariant): ReactNode {
  switch (v) {
    case 'success':
      return <CheckCircle2 size={16} />;
    case 'error':
      return <AlertCircle size={16} />;
    case 'warning':
      return <AlertCircle size={16} />;
    case 'info':
      return <Info size={16} />;
  }
}
