import { sessionStore } from '@/store';

export const sessionGuard = async (next) => {
  const session = sessionStore();

  if (!session.auth.session) {
    session.auth.resetCredentials();
    next({ name: 'Log In' });
  } else {
    next();
  }
}

export const resetPasswordGuard = async (to, from, next) => {
  const token = typeof to.query.token === 'string' ? to.query.token : null;
  const session = sessionStore();

  const result = await session.auth.checkAuth({ token: token }).catch(() => {});

  if(result && result.ok === true){
    next();
  } else {
    next({ name: 'Log In' });
  }
}

export const adminGuard = async (to, from, next) => {
  const session = sessionStore(); 

  if (!session.auth.user?.isAdmin) {
    next({ name: 'Home' });
  } else {
    next();
  }
}
