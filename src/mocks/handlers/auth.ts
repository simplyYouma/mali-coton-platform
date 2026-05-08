import { http, HttpResponse, delay } from 'msw';
import { findMockUser } from '../fixtures/users';
import { uuid } from '@/lib/uuid';

interface LoginBody {
  email: string;
  password: string;
}

export const authHandlers = [
  http.post('/api/v1/auth/login', async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as LoginBody;
    const user = findMockUser(body.email, body.password);
    if (!user) {
      return HttpResponse.json(
        {
          error: {
            code: 'invalid_credentials',
            message: 'Identifiants invalides.',
            correlationId: uuid(),
          },
        },
        { status: 401 },
      );
    }
    return HttpResponse.json({
      user,
      token: `demo.${user.id}.${Date.now()}`,
    });
  }),
];
