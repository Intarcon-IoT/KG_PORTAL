'use strict'

// Quita el prefijo kibooking_ de las tablas. RENAME TABLE es atómico y conserva datos, índices y claves ajenas
const TABLES = ['tenants', 'users', 'facilities', 'rooms', 'bookings']

exports.setup = function () {}

exports.up = function (db, callback) {
  db.runSql(`RENAME TABLE ${TABLES.map(t => `kibooking_${t} TO ${t}`).join(', ')}`, callback)
}

exports.down = function (db, callback) {
  db.runSql(`RENAME TABLE ${TABLES.map(t => `${t} TO kibooking_${t}`).join(', ')}`, callback)
}

exports._meta = { version: 1 }
