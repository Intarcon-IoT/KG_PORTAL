import { sessionStore } from '@/store';

export const sessionGuard = async (next) => {
  const { auth } = sessionStore();

  if (!auth.session) {
    auth.resetCredentials();
    next({ name: 'Log In' });
  } else {
    next();
  }

}
