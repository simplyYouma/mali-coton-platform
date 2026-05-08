import type { AuthenticatedUser } from '@/types/common';
import { http } from '@/lib/http';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthenticatedUser;
  token: string;
}

export function login(payload: LoginPayload): Promise<LoginResponse> {
  return http<LoginResponse>('/auth/login', { method: 'POST', body: payload });
}
