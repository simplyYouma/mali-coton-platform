import type { Paginated } from '@/types/common';
import { http } from '@/lib/http';
import type { Lab } from './labs.types';

export function fetchLabs(): Promise<Paginated<Lab>> {
  return http<Paginated<Lab>>('/labs');
}

export function fetchLab(id: string): Promise<Lab> {
  return http<Lab>(`/labs/${id}`);
}
