import { useState } from 'react';
import { ZoomIn } from 'lucide-react';
import type { KoboPhotoBackend } from '../api/sites.adapter';
import { API_ORIGIN } from '@/lib/apiConfig';
import { SitePhotoLightbox, type PhotoItem } from './SitePhotoLightbox';
import styles from './SitePhotoGallery.module.css';

const XPATH_CATEGORY: Record<string, string> = {
  'grp_d/photo_epi':          'EPI',
  'grp_d/photo_site':         'Vue générale',
  'grp_d/photo_site1':        'Vue générale',
  'grp_d/photo_site2':        'Vue générale',
  'grp_d/photo_equipements':  'Équipements',
  'grp_d/photo_securite':     'Sécurité',
};

export function photoCategory(xpath: string | null | undefined): string {
  if (!xpath) return 'Photo';
  return XPATH_CATEGORY[xpath] ?? 'Photo';
}

export function photoAbsUrl(p: KoboPhotoBackend): string {
  if (p.url) return API_ORIGIN + p.url;
  return (p.downloadMediumUrl ?? p.downloadUrl) ?? '';
}

interface SitePhotoGalleryProps {
  photos: KoboPhotoBackend[];
}

export function SitePhotoGallery({ photos }: SitePhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const lightboxItems: PhotoItem[] = photos.map((p) => ({
    id: p.id,
    src: photoAbsUrl(p),
    label: p.mediaFileBasename ?? `Photo ${p.id}`,
    category: photoCategory(p.questionXpath),
  }));

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.title}>Photos</span>
        <span className={styles.count}>
          {photos.length} photo{photos.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className={styles.grid}>
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={styles.card}
            onClick={() => setLightboxIndex(i)}
            aria-label={p.mediaFileBasename ?? `Photo ${i + 1}`}
          >
            <img
              src={photoAbsUrl(p)}
              alt={p.mediaFileBasename ?? ''}
              className={styles.thumb}
              loading="lazy"
            />
            <div className={styles.overlay}>
              <ZoomIn size={22} className={styles.zoomIcon} />
            </div>
            <span className={styles.badge}>{photoCategory(p.questionXpath)}</span>
            {p.mediaFileBasename ? (
              <span className={styles.caption}>{p.mediaFileBasename}</span>
            ) : null}
          </button>
        ))}
      </div>

      <SitePhotoLightbox
        items={lightboxItems}
        startIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
}
