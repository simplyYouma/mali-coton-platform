/**
 * Shared domain primitives and utility types.
 */

export type UserRole = 'agent' | 'superviseur' | 'admin' | 'lab' | 'visitor';

export type Locale = 'fr' | 'bm';

export type ConformityLevel = 'conforming' | 'warning' | 'critical';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  assignedSiteIds: string[];
  locale: Locale;
  /** Numéro mobile au format E.164 — utilisé pour les notifications SMS. */
  phone?: string;
  /**
   * Identifiant de l'utilisateur dans Kobo Toolbox. C'est ce champ qui
   * permet d'associer une soumission Kobo (qui ne connaît que cet identifiant)
   * à un agent du référentiel plateforme.
   */
  koboUsername?: string;
}

export interface ApiError {
  code: string;
  message: string;
  correlationId: string;
  details?: Record<string, unknown>;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GpsPoint {
  lat: number;
  lng: number;
  accuracy?: number;
}
