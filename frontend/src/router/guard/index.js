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
export const resetPasswordGuard = async (to, from, next) => {
  const token = typeof to.query.token === 'string' ? to.query.token : null;
  const { auth } = sessionStore();

  const result = await auth.checkAuth({ token: token }).catch(() => {});

  if(result && result.ok === true){
    next();
  } else {
    next({ name: 'Log In' });
  }
}
