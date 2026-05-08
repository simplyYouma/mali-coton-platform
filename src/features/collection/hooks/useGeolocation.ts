import { useCallback, useState } from 'react';
import type { GpsPoint } from '@/types/common';

/**
 * Capture GPS via l'API navigateur — CDC §3.3 "Géolocalisation GPS automatique
 * à chaque enregistrement".
 *
 * On utilise `getCurrentPosition` (one-shot) plutôt que `watchPosition` :
 *  - moins gourmand en batterie sur tablette terrain
 *  - cohérent avec le CDC qui demande un horodatage GPS-validé au moment
 *    de la soumission, pas un suivi continu.
 *
 * Précision visée : ≤ 20 m (utile pour traçabilité site). Au-dessus,
 * on lève un warning visible dans l'UI (l'agent peut retenter ou ignorer).
 */

export type GeolocationStatus = 'idle' | 'requesting' | 'success' | 'error';

export interface GeolocationError {
  code: 'permission_denied' | 'unavailable' | 'timeout' | 'unsupported';
  message: string;
}

interface UseGeolocationResult {
  status: GeolocationStatus;
  position: GpsPoint | null;
  error: GeolocationError | null;
  capture: () => Promise<GpsPoint | null>;
  reset: () => void;
}

const DEFAULT_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 0,
};

function mapPositionError(err: GeolocationPositionError): GeolocationError {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return { code: 'permission_denied', message: 'Permission de localisation refusée' };
    case err.POSITION_UNAVAILABLE:
      return { code: 'unavailable', message: 'Position GPS indisponible' };
    case err.TIMEOUT:
      return { code: 'timeout', message: "Délai d'acquisition GPS dépassé" };
    default:
      return { code: 'unavailable', message: 'Erreur de géolocalisation' };
  }
}

export function useGeolocation(options: PositionOptions = DEFAULT_OPTIONS): UseGeolocationResult {
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [position, setPosition] = useState<GpsPoint | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);

  const capture = useCallback((): Promise<GpsPoint | null> => {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        const unsupported: GeolocationError = {
          code: 'unsupported',
          message: "Géolocalisation non supportée par cet appareil",
        };
        setError(unsupported);
        setStatus('error');
        resolve(null);
        return;
      }

      setStatus('requesting');
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const point: GpsPoint = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setPosition(point);
          setStatus('success');
          resolve(point);
        },
        (err) => {
          const mapped = mapPositionError(err);
          setError(mapped);
          setStatus('error');
          resolve(null);
        },
        options,
      );
    });
  }, [options]);

  const reset = useCallback(() => {
    setStatus('idle');
    setPosition(null);
    setError(null);
  }, []);

  return { status, position, error, capture, reset };
}
