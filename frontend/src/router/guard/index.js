import { sessionStore } from '@/store'
import { ROLES } from '@/utils/constants'

// Guards con retorno (vue-router 5 depreca el callback next): undefined deja pasar, una ruta redirige
export const sessionGuard = () => {
  const session = sessionStore()
  if (session.auth.session) return
  session.auth.resetCredentials()
  return { name: 'Log In' }
}

export const resetPasswordGuard = async (to) => {
  const token = typeof to.query.token === 'string' ? to.query.token : null
  const session = sessionStore()
  const result = await session.auth.checkAuth({ token }).catch(() => {})
  if (result?.ok !== true) return { name: 'Log In' }
}

export const adminGuard = () => {
  const session = sessionStore()
  if (session.auth.user?.role !== ROLES.ADMIN) return { name: 'Home' }
}

export const gestorGuard = () => {
  const session = sessionStore()
  if (session.auth.user?.role !== ROLES.GESTOR && session.auth.user?.role !== ROLES.ADMIN) return { name: 'Home' }
}
