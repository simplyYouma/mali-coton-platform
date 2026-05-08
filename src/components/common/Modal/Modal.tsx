import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from '../IconButton/IconButton';
import styles from './Modal.module.css';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number | string;
  closeOnOverlay?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 520,
  closeOnOverlay = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={styles.overlay}
      onClick={closeOnOverlay ? onClose : undefined}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-desc' : undefined}
        className={styles.dialog}
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <header className={styles.header}>
            <div>
              <h2 id="modal-title" className={styles.title}>
                {title}
              </h2>
              {description ? (
                <p id="modal-desc" className={styles.description}>
                  {description}
                </p>
              ) : null}
            </div>
            <IconButton aria-label="Fermer" onClick={onClose}>
              <X size={18} />
            </IconButton>
          </header>
        ) : null}
        <div className={styles.body}>{children}</div>
        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
