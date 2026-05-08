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
