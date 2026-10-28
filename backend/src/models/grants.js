const { randomUUID } = require('crypto')
const mysqlAdapter = require('../utils/mysqlAdapter')

// Permisos concedidos a un usuario o a un rol; tablas fijas para no interpolar nada que venga de fuera
const TARGETS = {
  user: { table: 'user_permissions', column: 'user_uuid' },
  role: { table: 'role_permissions', column: 'role_uuid' },
}

// query() no rechaza: dentro de una transacción hay que lanzar para que haga rollback
const check = async pending => { const result = await pending; if (result?.error) throw new Error('Error en la operación'); return result }

const grants = {}

grants.read = async (target, uuid) => {
  const { table, column } = TARGETS[target]
  const rows = await mysqlAdapter.query(`SELECT permission FROM ${table} WHERE ${column} = ? ORDER BY permission`, [uuid])
  return rows.error ? rows : rows.map(r => r.permission)
}

// Sustituye la lista entera; conserva quién concedió los que ya estaban. Sin transacción propia: va dentro de una
grants.apply = async (target, uuid, list, grantedBy) => {
  const { table, column } = TARGETS[target]
  const current = await check(grants.read(target, uuid))
  const removed = current.filter(p => !list.includes(p))
  const added = list.filter(p => !current.includes(p))
  if (removed.length) await check(mysqlAdapter.query(`DELETE FROM ${table} WHERE ${column} = ? AND permission IN (?)`, [uuid, removed]))
  if (added.length) await check(mysqlAdapter.query(`INSERT INTO ${table} (uuid, ${column}, permission, granted_by) VALUES ?`, [added.map(p => [randomUUID(), uuid, p, grantedBy])]))
  return { added, removed }
}

grants.replace = (target, uuid, list, grantedBy) => mysqlAdapter.runInTransaction(() => grants.apply(target, uuid, list, grantedBy))

grants.split = text => text ? text.split(',') : []

module.exports = grants
