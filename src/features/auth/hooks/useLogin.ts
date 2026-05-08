import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { login, type LoginPayload } from '../api/auth';

const ROLE_HOME: Record<string, string> = {
  admin: '/dashboard',
  superviseur: '/dashboard',
  agent: '/collecte',
};

export function useLogin() {
  const navigate = useNavigate();
  const { login: storeLogin } = useAuth();

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: (data) => {
      storeLogin(data.user);
      navigate(ROLE_HOME[data.user.role] ?? '/', { replace: true });
    },
  });
}
