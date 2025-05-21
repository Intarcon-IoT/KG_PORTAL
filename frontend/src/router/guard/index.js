import { sessionStore } from '@/store';

export const sessionGuard = (next) => {
  const { auth } = sessionStore();

  if (!auth.session) {
    auth.resetCredentials();
    next({ name: 'Log In' });
  }

  next();
}
