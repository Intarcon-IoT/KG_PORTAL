const Role = require('../models/role')
const permissions = require('../utils/permissions')
const { ROLES } = require('../utils/constants')

const roleCtrl = {}

// Valida nombre, descripción y permisos del body; devuelve { error } o los datos limpios
const parse = (body, { partial = false } = {}) => {
  const data = {}
  if (!partial || body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 60) return { error: 'El nombre es obligatorio y de 60 caracteres como máximo' }
    data.name = body.name.trim()
  }
  if (body.description !== undefined) {
    if (body.description !== null && (typeof body.description !== 'string' || body.description.length > 255)) return { error: 'La descripción no puede pasar de 255 caracteres' }
    data.description = body.description?.trim() || null
  }
  let list
  if (body.permissions !== undefined) {
    if (!Array.isArray(body.permissions) || body.permissions.some(p => typeof p !== 'string')) return { error: 'permissions debe ser una lista de permisos' }
    const unknown = body.permissions.filter(p => !permissions.exists(p))
    if (unknown.length) return { error: `Permisos desconocidos: ${unknown.join(', ')}` }
    list = permissions.normalize(body.permissions)
  }
  return { data, list }
}

roleCtrl.getRoles = async (req, res) => {
  const result = await new Role().list()
  if (result.error) return res.status(500).json({ ok: false, message: 'Error al obtener los roles' })
  res.json(result)
}

roleCtrl.createRole = async (req, res) => {
  const { error, data, list } = parse(req.body)
  if (error) return res.status(400).json({ ok: false, message: error })
  if (await Role.nameTaken(data.name)) return res.status(409).json({ ok: false, message: 'Ya existe un rol con ese nombre' })
  try {
    const created = await new Role().create(data, list || [], res.locals.user.uuid)
    res.json({ ok: true, ...created, message: 'Rol creado' })
  } catch {
    // Dos altas a la vez con el mismo nombre: la segunda choca con el índice único
    if (await Role.nameTaken(data.name)) return res.status(409).json({ ok: false, message: 'Ya existe un rol con ese nombre' })
    res.status(500).json({ ok: false, message: 'Error al crear el rol' })
  }
}

// Los de sistema conservan el nombre y el Administrador no lleva permisos: los tiene todos
roleCtrl.updateRole = async (req, res) => {
  const role = new Role(req.params.uuid)
  const current = await role.read()
  if (current.error) return res.status(500).json({ ok: false, message: 'Error al actualizar el rol' })
  if (!current) return res.status(404).json({ ok: false, message: 'Rol no encontrado' })

  const { error, data, list } = parse(req.body, { partial: true })
  if (error) return res.status(400).json({ ok: false, message: error })
  if (current.system && data.name !== undefined && data.name !== current.name) return res.status(400).json({ ok: false, message: 'Los roles de sistema no se renombran' })
  if (current.code === ROLES.ADMIN && list?.length) return res.status(400).json({ ok: false, message: 'El administrador ya tiene todos los permisos' })
  if (data.name && await Role.nameTaken(data.name, current.uuid)) return res.status(409).json({ ok: false, message: 'Ya existe un rol con ese nombre' })
  try {
    await role.update(data, list, res.locals.user.uuid)
    res.json({ ok: true, message: 'Rol actualizado' })
  } catch {
    res.status(500).json({ ok: false, message: 'Error al actualizar el rol' })
  }
}

roleCtrl.deleteRole = async (req, res) => {
  const role = new Role(req.params.uuid)
  const current = await role.read()
  if (current.error) return res.status(500).json({ ok: false, message: 'Error al borrar el rol' })
  if (!current) return res.status(404).json({ ok: false, message: 'Rol no encontrado' })
  if (current.system) return res.status(400).json({ ok: false, message: 'Los roles de sistema no se borran' })
  if (current.users > 0) return res.status(409).json({ ok: false, message: `El rol tiene ${current.users} usuario(s): cámbiales el rol antes de borrarlo` })
  const result = await role.delete()
  if (result.error) return res.status(500).json({ ok: false, message: 'Error al borrar el rol' })
  res.json({ ok: true, message: 'Rol borrado' })
}

module.exports = roleCtrl
