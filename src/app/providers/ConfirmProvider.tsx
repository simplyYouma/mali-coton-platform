import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button, Modal } from '@/components/common';

/**
 * Boîte de confirmation single source of truth. Remplace `window.confirm()`
 * pour respecter le design system. API promise-based :
 *
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: 'Supprimer ?',
 *     message: 'Cette action est irréversible.',
 *     confirmLabel: 'Supprimer',
 *     tone: 'danger',
 *   });
 *   if (ok) doIt();
 */

export interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  /** Texte du bouton de confirmation (défaut : "Confirmer"). */
  confirmLabel?: string;
  /** Texte du bouton annulation (défaut : "Annuler"). */
  cancelLabel?: string;
  /** Tonalité visuelle du bouton de confirmation. */
  tone?: 'primary' | 'danger';
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  // Référence vers le resolve à appeler quand le modal se ferme par clic overlay.
  const closingRef = useRef(false);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const settle = (ok: boolean) => {
    if (!pending) return;
    if (closingRef.current) return;
    closingRef.current = true;
    pending.resolve(ok);
    setPending(null);
    // Réinitialise le flag après le tick (le state est consumed)
    setTimeout(() => {
      closingRef.current = false;
    }, 0);
  };

  const isDanger = pending?.tone === 'danger';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={pending !== null}
        onClose={() => settle(false)}
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {isDanger ? (
              <AlertTriangle size={16} color="var(--color-danger)" aria-hidden="true" />
            ) : null}
            {pending?.title ?? ''}
          </span>
        }
        width={460}
        footer={
          <>
            <Button variant="ghost" onClick={() => settle(false)}>
              {pending?.cancelLabel ?? 'Annuler'}
            </Button>
            <Button
              variant={isDanger ? 'danger' : 'primary'}
              iconLeft={isDanger ? <Trash2 size={14} /> : undefined}
              onClick={() => settle(true)}
            >
              {pending?.confirmLabel ?? 'Confirmer'}
            </Button>
          </>
        }
      >
        {pending?.message ? (
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text)', lineHeight: 1.5 }}>
            {pending.message}
          </p>
        ) : null}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used inside <ConfirmProvider>.');
  }
  return ctx;
}
