import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import styles from './KoboImage.module.css';

interface SitePhotoProps {
  src: string;
  alt?: string;
  fullUrl?: string;
}

export function SitePhoto({ src, alt = 'Photo du site', fullUrl }: SitePhotoProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={`${styles.wrapper} ${styles.wrapperError}`}>
        <ImageOff size={18} className={styles.errorIcon} />
        <span className={styles.errorText}>Photo non disponible</span>
      </div>
    );
  }

  return (
    <a
      href={fullUrl ?? src}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <img
        src={src}
        alt={alt}
        onError={() => setError(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </a>
  );
}
