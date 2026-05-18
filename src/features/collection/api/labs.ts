import type { Paginated } from '@/types/common';
import { http } from '@/lib/http';
import type { Lab } from './labs.types';

export interface LabCreateInput {
  name: string;
  city: string;
  contactEmail?: string;
  contactPhone?: string;
  slaBusinessDays: number;
}

export function fetchLabs(): Promise<Paginated<Lab>> {
  return http<Paginated<Lab>>('/labs');
}

export function fetchLab(id: string): Promise<Lab> {
  return http<Lab>(`/labs/${id}`);
}

export function createLab(input: LabCreateInput): Promise<Lab> {
  return http<Lab>('/labs', { method: 'POST', body: input });
}
