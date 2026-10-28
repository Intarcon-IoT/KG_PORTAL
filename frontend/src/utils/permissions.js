import { ROLES } from './constants'

// Misma regla que el backend (utils/permissions.js): el administrador tiene todos los permisos
export const can = (user, permission) => !!user && (user.role === ROLES.ADMIN || (user.permissions || []).includes(permission))

// meta.permission de una ruta: uno o varios, basta con tener alguno
export const canAny = (user, permission) => !permission || [].concat(permission).some(p => can(user, p))
