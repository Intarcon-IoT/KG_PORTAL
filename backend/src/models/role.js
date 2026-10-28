const { randomUUID } = require('crypto')
const mysqlAdapter = require('../utils/mysqlAdapter')
const grants = require('./grants')

// Roles con permisos por defecto; users.role guarda el `code`. Los de sistema (Admin, Gestor, User) no se borran ni renombran
const LIST_SQL = `SELECT r.uuid, r.code, r.name, r.description, r.system,
  (SELECT GROUP_CONCAT(rp.permission ORDER BY rp.permission) FROM role_permissions rp WHERE rp.role_uuid = r.uuid) AS permissions,
  (SELECT COUNT(*) FROM users u WHERE u.role = r.code) AS users
  FROM roles r`

// Código interno a partir del nombre: sin acentos ni espacios, 20 caracteres como users.role
const toCode = name => name.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 20) || 'rol'

class Role {
  constructor(uuid) {
    this.uuid = uuid
  }

  async list() {
    const rows = await mysqlAdapter.query(`${LIST_SQL} ORDER BY r.system DESC, r.name`, [])
    return rows.error ? rows : rows.map(r => ({ ...r, system: r.system === 1, permissions: grants.split(r.permissions) }))
  }

  // Fila del rol, false si no existe, { error } si falla la BD
  async read() {
    const rows = await mysqlAdapter.query(`${LIST_SQL} WHERE r.uuid = ?`, [this.uuid])
    if (rows.error) return rows
    return rows[0] ? { ...rows[0], system: rows[0].system === 1, permissions: grants.split(rows[0].permissions) } : false
  }

  // Código tal como está guardado (MySQL compara sin mayúsculas y el código JS sí), false si no existe, null si falla la BD
  static async codeOf(code) {
    if (typeof code !== 'string' || !code) return false
    const rows = await mysqlAdapter.query('SELECT code FROM roles WHERE code = ?', [code])
    return rows.error ? null : rows[0]?.code || false
  }

  static async nameTaken(name, exceptUuid = null) {
    const rows = await mysqlAdapter.query('SELECT 1 FROM roles WHERE name = ? AND uuid <> ?', [name, exceptUuid || ''])
    return rows.error ? null : rows.length > 0
  }

  // Alta con sus permisos en una transacción; el código se desambigua si ya existe
  async create({ name, description }, permissions, grantedBy) {
    this.uuid = randomUUID()
    const base = toCode(name)
    return mysqlAdapter.runInTransaction(async () => {
      const taken = await mysqlAdapter.query('SELECT code FROM roles WHERE code LIKE ?', [`${base.slice(0, 17)}%`])
      if (taken.error) throw new Error('Error al crear el rol')
      const codes = new Set(taken.map(r => r.code.toLowerCase()))
      let code = base
      for (let n = 2; codes.has(code.toLowerCase()); n++) code = `${base.slice(0, 20 - String(n).length - 1)}_${n}`
      const result = await mysqlAdapter.query('INSERT INTO roles SET ?', { uuid: this.uuid, code, name, description: description || null, system: 0 })
      if (result.error) throw new Error('Error al crear el rol')
      await grants.apply('role', this.uuid, permissions, grantedBy)
      return { uuid: this.uuid, code }
    })
  }

  async update(data, permissions, grantedBy) {
    return mysqlAdapter.runInTransaction(async () => {
      if (Object.keys(data).length) {
        const result = await mysqlAdapter.query('UPDATE roles SET ? WHERE uuid = ?', [data, this.uuid])
        if (result.error) throw new Error('Error al actualizar el rol')
      }
      if (permissions) await grants.apply('role', this.uuid, permissions, grantedBy)
    })
  }

  delete() {
    return mysqlAdapter.query('DELETE FROM roles WHERE uuid = ? AND `system` = 0', [this.uuid])
  }
}

module.exports = Role
