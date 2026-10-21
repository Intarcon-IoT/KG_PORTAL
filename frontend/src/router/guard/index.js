import { sessionStore } from '@/store'
import { ROLES } from '@/utils/constants'

// Guards con retorno (vue-router 5 depreca el callback next): undefined deja pasar, una ruta redirige
export const sessionGuard = () => {
  const session = sessionStore()
  if (session.auth.session) return
  session.auth.resetCredentials()
  return { name: 'Log In' }
}

// El enlace de recuperación trae el token en el fragmento (#token=...), que no llega al servidor
export const readResetToken = route => new URLSearchParams((route.hash || '').slice(1)).get('token')

export const resetPasswordGuard = async (to) => {
  const token = readResetToken(to)
  if (!token) return { name: 'Log In' }
  const result = await sessionStore().auth.checkResetToken(token).catch(() => {})
  if (result?.ok !== true) return { name: 'Forgot Password' }
}

export const adminGuard = () => {
  const session = sessionStore()
  if (session.auth.user?.role !== ROLES.ADMIN) return { name: 'Home' }
}

