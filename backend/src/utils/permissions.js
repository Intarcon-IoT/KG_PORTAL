const { ROLES } = require('./constants')

// Catálogo de módulos y acciones; el permiso es `modulo.accion` y `requires` añade los que implica. `group` agrupa
// los módulos en la pantalla y `hint` explica la acción cuando el título no basta
const MODULES = [
  {
    key: 'bookings', group: 'Reservas', icon: 'fa-regular fa-calendar', title: 'Reservas de salas', description: 'Todos reservan; esto amplía lo que pueden hacer con las reservas',
    actions: [
      { key: 'auto_approve', title: 'Reservar sin validación', hint: 'Sus reservas se aprueban solas también en salas con validación' },
      { key: 'manage', title: 'Editar y borrar reservas de otros', hint: 'Solo las ya aprobadas' },
      { key: 'validate', title: 'Validar reservas', hint: 'Aprobar o rechazar las pendientes; ve «Validar reservas» y el contador', requires: ['manage'] },
    ],
  },
  {
    key: 'rooms', group: 'Reservas', icon: 'fa-solid fa-door-open', title: 'Salas y edificios', description: 'Alta, edición y baja de salas y edificios',
    actions: [
      { key: 'manage', title: 'Gestionar salas y edificios', hint: 'Incluye el token de la pantalla de cada sala' },
    ],
  },
  {
    key: 'calls', group: 'Recepción', icon: 'fa-solid fa-phone-volume', title: 'Llamadas', description: 'Llamante, pedidos y tickets de posventa',
    actions: [
      { key: 'view', title: 'Consultar' },
      { key: 'write', title: 'Crear tickets, recordatorios e informes', requires: ['view'] },
    ],
  },
  {
    key: 'visits', group: 'Recepción', icon: 'fa-solid fa-id-card-clip', title: 'Visitas', description: 'Entradas, salidas y firmas de los visitantes',
    actions: [
      { key: 'view', title: 'Consultar' },
      { key: 'manage', title: 'Dar de alta y gestionar visitas', hint: 'Escribe en Odoo: manda la información previa y avisa al anfitrión', requires: ['view'] },
    ],
  },
  {
    key: 'users', group: 'Administración', icon: 'fa-solid fa-users', title: 'Usuarios', description: 'Nunca elige rol ni permisos ni toca a administradores u otros gestores de usuarios',
    actions: [
      { key: 'view', title: 'Consultar', hint: 'Los de su empresa' },
      { key: 'manage', title: 'Crear, editar y deshabilitar', hint: 'Los de su empresa; los crea como Usuario', requires: ['view'] },
      { key: 'all_companies', title: 'En todas las empresas', hint: 'Ve y gestiona usuarios de cualquier empresa y puede cambiársela', requires: ['manage'] },
    ],
  },
]

const REQUIRES = new Map(MODULES.flatMap(m => m.actions.map(a => [`${m.key}.${a.key}`, (a.requires || []).map(r => `${m.key}.${r}`)])))

const permissions = {}

permissions.catalog = () => MODULES.map(m => ({ ...m, actions: m.actions.map(a => ({ ...a, key: `${m.key}.${a.key}`, requires: REQUIRES.get(`${m.key}.${a.key}`) })) }))

permissions.exists = permission => REQUIRES.has(permission)

// Quita los desconocidos y añade los implícitos (`calls.write` arrastra `calls.view`)
permissions.normalize = list => {
  const result = new Set()
  const add = p => { if (!REQUIRES.has(p) || result.has(p)) return; result.add(p); REQUIRES.get(p).forEach(add) }
  for (const p of Array.isArray(list) ? list : []) add(p)
  return [...result].sort()
}

// El administrador tiene todos los permisos sin necesidad de asignarlos
permissions.has = (user, permission) => !!user && (user.role === ROLES.ADMIN || (user.permissions || []).includes(permission))

module.exports = permissions
