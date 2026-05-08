import { create } from 'zustand';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { uuid } from '@/lib/uuid';

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
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 'var(--space-5)',
        right: 'var(--space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        zIndex: 'var(--z-toast)' as unknown as number,
        maxWidth: '360px',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.variant === 'error' ? 'alert' : 'status'}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderLeft: `3px solid var(--color-${variantToColor(t.variant)})`,
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3) var(--space-4)',
            boxShadow: 'var(--shadow-md)',
            fontSize: 'var(--text-body)',
          }}
        >
          {t.message}
        </div>
      ))}
    </div>,
    document.body,
  );
}

function variantToColor(v: ToastVariant): string {
  switch (v) {
    case 'success':
      return 'success';
    case 'error':
      return 'danger';
    case 'warning':
      return 'warning';
    case 'info':
      return 'info';
  }
}
