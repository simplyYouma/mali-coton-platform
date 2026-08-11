import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Download, ImageOff } from 'lucide-react';
import styles from './SitePhotoLightbox.module.css';

export interface PhotoItem {
  id: string | number;
  src: string;
  label: string;
  category?: string;
}

interface SitePhotoLightboxProps {
  items: PhotoItem[];
  startIndex: number;
  open: boolean;
  onClose: () => void;
}

export function SitePhotoLightbox({ items, startIndex, open, onClose }: SitePhotoLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (open) {
      setIndex(startIndex);
      setImgError(false);
    }
  }, [open, startIndex]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + items.length) % items.length);
    setImgError(false);
  }, [items.length]);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % items.length);
    setImgError(false);
  }, [items.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, prev, next, onClose]);

  if (!open || items.length === 0) return null;

  const item = items[index]!;
  const multiple = items.length > 1;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Visionneuse de photos"
      onClick={onClose}
    >
      {/* ── Barre supérieure ── */}
      <div className={styles.topBar} onClick={(e) => e.stopPropagation()}>
        <div className={styles.topInfo}>
          {item.category && <span className={styles.catBadge}>{item.category}</span>}
          <span className={styles.filename} title={item.label}>{item.label}</span>
        </div>
        <div className={styles.topActions}>
          {multiple && (
            <span className={styles.counter}>{index + 1} / {items.length}</span>
          )}
          <a
            href={item.src}
            download={item.label}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.actionBtn}
            aria-label="Télécharger"
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={15} />
          </a>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* ── Zone image + flèches ── */}
      <div className={styles.middle} onClick={(e) => e.stopPropagation()}>
        {multiple && (
          <button
            type="button"
            className={`${styles.navBtn} ${styles.navPrev}`}
            onClick={prev}
            aria-label="Photo précédente"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        <figure className={styles.frame}>
          {imgError ? (
            <div className={styles.imgError}>
              <ImageOff size={36} />
              <span>Photo non disponible</span>
            </div>
          ) : (
            <img
              key={index}
              src={item.src}
              alt={item.label}
              className={styles.mainImg}
              onError={() => setImgError(true)}
            />
          )}
        </figure>

        {multiple && (
          <button
            type="button"
            className={`${styles.navBtn} ${styles.navNext}`}
            onClick={next}
            aria-label="Photo suivante"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {/* ── Strip miniatures ── */}
      {multiple && (
        <div
          className={styles.thumbStrip}
          role="tablist"
          aria-label="Miniatures"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((it, i) => (
            <button
              key={it.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              className={`${styles.thumb} ${i === index ? styles.thumbActive : ''}`}
              onClick={() => { setIndex(i); setImgError(false); }}
              aria-label={it.label}
            >
              <img src={it.src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
