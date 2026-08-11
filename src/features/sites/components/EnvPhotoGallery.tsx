import { useEffect, useState } from 'react';
import { ZoomIn, ImageOff } from 'lucide-react';
import { getToken } from '@/lib/tokenStore';
import { API_BASE } from '@/lib/apiConfig';
import type { MediaEnvironnemental } from '../api/donneesEnv';
import { SitePhotoLightbox, type PhotoItem } from './SitePhotoLightbox';
import galleryStyles from './SitePhotoGallery.module.css';
import styles from './EnvPhotoGallery.module.css';

const CATEGORIE_LABEL: Record<string, string> = {
  PHOTO_EAU:         'Eau',
  PHOTO_SOL:         'Sol',
  PHOTO_AIR:         'Air',
  PHOTO_DECHETS:     'Déchets',
  PHOTO_PRELEVEMENT: 'Prélèvement',
  PHOTO_SITE:        'Site',
};

function catLabel(cat: string): string {
  return CATEGORIE_LABEL[cat] ?? cat.replace(/^PHOTO_/, '').replace(/_/g, ' ');
}

type BlobEntry = { src: string | null; status: 'loading' | 'ok' | 'error' };

interface EnvPhotoGalleryProps {
  medias: MediaEnvironnemental[];
}

export function EnvPhotoGallery({ medias }: EnvPhotoGalleryProps) {
  const [blobMap, setBlobMap] = useState<Map<string, BlobEntry>>(
    () => new Map(medias.map((m) => [m.id, { src: null, status: 'loading' }])),
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (medias.length === 0) return;
    const objUrls: string[] = [];
    const token = getToken();

    for (const media of medias) {
      const url = `${API_BASE}/medias_environnementaux/${media.id}/telecharger`;
      fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        .then((r) => {
          if (!r.ok) throw new Error(`${r.status}`);
          return r.blob();
        })
        .then((blob) => {
          const objUrl = URL.createObjectURL(blob);
          objUrls.push(objUrl);
          setBlobMap((prev) => {
            const next = new Map(prev);
            next.set(media.id, { src: objUrl, status: 'ok' });
            return next;
          });
        })
        .catch(() => {
          setBlobMap((prev) => {
            const next = new Map(prev);
            next.set(media.id, { src: null, status: 'error' });
            return next;
          });
        });
    }

    return () => {
      for (const u of objUrls) URL.revokeObjectURL(u);
    };
  }, []); // chargé une fois au montage

  if (medias.length === 0) return null;

  // Items pour le lightbox : uniquement ceux dont le blob est prêt
  const okItems: PhotoItem[] = medias.flatMap((m) => {
    const entry = blobMap.get(m.id);
    if (!entry || entry.status !== 'ok' || !entry.src) return [];
    return [{ id: m.id, src: entry.src, label: catLabel(m.categorie), category: catLabel(m.categorie) }];
  });

  return (
    <div className={styles.root}>
      <div className={galleryStyles.header}>
        <span className={galleryStyles.title}>Photos environnementales</span>
        <span className={galleryStyles.count}>
          {medias.length} photo{medias.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className={galleryStyles.grid}>
        {medias.map((m) => {
          const entry = blobMap.get(m.id) ?? { src: null, status: 'loading' as const };
          const okIndex = okItems.findIndex((it) => it.id === m.id);

          return (
            <button
              key={m.id}
              type="button"
              className={`${galleryStyles.card} ${entry.status !== 'ok' ? styles.cardInert : ''}`}
              onClick={() => okIndex >= 0 ? setLightboxIndex(okIndex) : undefined}
              aria-label={catLabel(m.categorie)}
            >
              {entry.status === 'loading' && <div className={styles.cardLoading} />}

              {entry.status === 'error' && (
                <div className={styles.cardError}>
                  <ImageOff size={20} />
                </div>
              )}

              {entry.status === 'ok' && entry.src && (
                <>
                  <img
                    src={entry.src}
                    alt={catLabel(m.categorie)}
                    className={galleryStyles.thumb}
                    loading="lazy"
                  />
                  <div className={galleryStyles.overlay}>
                    <ZoomIn size={22} className={galleryStyles.zoomIcon} />
                  </div>
                </>
              )}

              <span className={galleryStyles.badge}>{catLabel(m.categorie)}</span>
            </button>
          );
        })}
      </div>

      <SitePhotoLightbox
        items={okItems}
        startIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
}
