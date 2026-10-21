'use strict'

// Los usuarios no se borran (conservan sus reservas): se deshabilitan con active = 0

exports.setup = function () {}

exports.up = function (db, callback) {
  db.runSql('ALTER TABLE users ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 1 AFTER tenant_uuid', callback)
}

exports.down = function (db, callback) {
  db.runSql('ALTER TABLE users DROP COLUMN active', callback)
}

exports._meta = { version: 1 }
