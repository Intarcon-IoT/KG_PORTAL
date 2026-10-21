import { ROLES } from './constants'

// Textos de la UI para valores que se guardan en BD sin traducir
export const ROLE_LABELS = { [ROLES.ADMIN]: 'Administrador', [ROLES.GESTOR]: 'Gestor', [ROLES.USER]: 'Usuario' }

export const initialsOf = text => (text || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
