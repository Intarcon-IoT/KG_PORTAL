import { sessionStore } from '@/store';
import { ROLES } from '@/utils/constants';

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

  if (session.auth.user?.role !== ROLES.ADMIN) {
    next({ name: 'Home' });
  } else {
    next();
  }
}

export const gestorGuard = async (to, from, next) => {
  const session = sessionStore(); 

  if (session.auth.user?.role !== ROLES.GESTOR && session.auth.user?.role !== ROLES.ADMIN) {
    next({ name: 'Home' });
  } else {
    next();
  }
}
