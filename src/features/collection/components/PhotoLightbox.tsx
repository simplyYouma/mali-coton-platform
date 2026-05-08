import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import type { PhotoAttachment } from '../api/collection.types';
import styles from './PhotoLightbox.module.css';

interface PhotoLightboxProps {
  photos: PhotoAttachment[];
  startIndex: number;
  open: boolean;
  onClose: () => void;
}

export function PhotoLightbox({ photos, startIndex, open, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    if (open) setIndex(startIndex);
  }, [open, startIndex]);

  const prev = useCallback(
    () => setIndex((i) => (i - 1 + photos.length) % photos.length),
    [photos.length],
  );
  const next = useCallback(
    () => setIndex((i) => (i + 1) % photos.length),
    [photos.length],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, prev, next, onClose]);

  if (!open || photos.length === 0) return null;
  const photo = photos[index]!;
  const multiple = photos.length > 1;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Visionneuse de photos"
      onClick={onClose}
    >
      <button
        type="button"
        className={styles.closeBtn}
        onClick={onClose}
        aria-label="Fermer"
      >
        <X size={18} />
      </button>

      {multiple ? (
        <button
          type="button"
          className={`${styles.navBtn} ${styles.navPrev}`}
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          aria-label="Photo précédente"
        >
          <ChevronLeft size={20} />
        </button>
      ) : null}

      <figure className={styles.frame} onClick={(e) => e.stopPropagation()}>
        <div className={styles.imageWrap}>
          <img src={photo.url} alt={photo.note ?? `Photo ${photo.id}`} />
        </div>
        <figcaption className={styles.caption}>
          <span className={styles.captionNote}>{photo.note ?? 'Sans légende'}</span>
          <span className={styles.captionMeta}>
            {formatDateTime(photo.takenAt, 'dd MMM yyyy · HH:mm')}
            {multiple ? (
              <>
                <span className={styles.captionDot} aria-hidden="true">·</span>
                <span className={styles.captionCount}>
                  {index + 1} / {photos.length}
                </span>
              </>
            ) : null}
          </span>
        </figcaption>
      </figure>

      {multiple ? (
        <button
          type="button"
          className={`${styles.navBtn} ${styles.navNext}`}
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          aria-label="Photo suivante"
        >
          <ChevronRight size={20} />
        </button>
      ) : null}

      {multiple ? (
        <div
          className={styles.thumbStrip}
          onClick={(e) => e.stopPropagation()}
          role="tablist"
          aria-label="Miniatures"
        >
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              className={`${styles.thumb} ${i === index ? styles.thumbActive : ''}`}
              onClick={() => setIndex(i)}
              aria-label={p.note ?? `Photo ${i + 1}`}
            >
              <img src={p.url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
