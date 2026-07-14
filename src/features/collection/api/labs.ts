import type { Paginated } from '@/types/common';
import { http } from '@/lib/http';
import { API_MODE, resourcePath } from '@/lib/apiConfig';
import { unwrapPaginated } from '@/lib/jsonld';
import type { Lab } from './labs.types';

export interface LabCreateInput {
  name: string;
  city: string;
  contactEmail?: string;
  contactPhone?: string;
  slaBusinessDays: number;
}

export async function fetchLabs(): Promise<Paginated<Lab>> {
  const raw = await http<unknown>(resourcePath('labs'));
  if (API_MODE === 'live') return unwrapPaginated<Lab>(raw);
  return raw as Paginated<Lab>;
}

export async function fetchLab(id: string): Promise<Lab> {
  return http<Lab>(resourcePath('labs', id));
}

export function createLab(input: LabCreateInput): Promise<Lab> {
  return http<Lab>(resourcePath('labs'), { method: 'POST', body: input });
}
