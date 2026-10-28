'use strict'

// Roles gestionables (Admin, Gestor y User son de sistema) y permisos por módulo (`modulo.accion`) de roles y usuarios.
// users.role pasa a ser FK de roles.code; el catálogo de permisos vive en src/utils/permissions.js
const GESTOR = ['bookings.auto_approve', 'bookings.manage', 'users.manage', 'users.view']

exports.setup = function () {}

exports.up = function (db, callback) {
  db.runSql(`
    CREATE TABLE roles (
      id          int NOT NULL AUTO_INCREMENT,
      uuid        varchar(36) NOT NULL,
      code        varchar(20) NOT NULL,
      name        varchar(60) NOT NULL,
      description varchar(255) NULL,
      \`system\`  tinyint(1) NOT NULL DEFAULT 0,
      create_ts   timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_ts  timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uuid (uuid),
      UNIQUE KEY code (code),
      UNIQUE KEY name (name)
    ) ENGINE=InnoDB;

    INSERT INTO roles (uuid, code, name, description, \`system\`) VALUES
      (UUID(), 'Admin', 'Administrador', 'Acceso total al portal y a todos los módulos', 1),
      (UUID(), 'Gestor', 'Gestor', 'Reservas sin validación, reservas aprobadas de otros y usuarios de su empresa', 1),
      (UUID(), 'User', 'Usuario', 'Reserva salas; las que requieren validación quedan pendientes', 1);

    CREATE TABLE role_permissions (
      id         int NOT NULL AUTO_INCREMENT,
      uuid       varchar(36) NOT NULL,
      role_uuid  varchar(36) NOT NULL,
      permission varchar(64) NOT NULL,
      granted_by varchar(36) NULL,
      create_ts  timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_ts timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uuid (uuid),
      UNIQUE KEY role_permission (role_uuid, permission),
      CONSTRAINT fk_permission_role FOREIGN KEY (role_uuid) REFERENCES roles (uuid) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB;

    INSERT INTO role_permissions (uuid, role_uuid, permission)
    SELECT UUID(), r.uuid, p.permission FROM roles r
    JOIN (${GESTOR.map(p => `SELECT '${p}' AS permission`).join(' UNION ALL ')}) p
    WHERE r.code = 'Gestor';

    CREATE TABLE user_permissions (
      id         int NOT NULL AUTO_INCREMENT,
      uuid       varchar(36) NOT NULL,
      user_uuid  varchar(36) NOT NULL,
      permission varchar(64) NOT NULL,
      granted_by varchar(36) NULL,
      create_ts  timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_ts timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uuid (uuid),
      UNIQUE KEY user_permission (user_uuid, permission),
      CONSTRAINT fk_permission_user FOREIGN KEY (user_uuid) REFERENCES users (uuid) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB;

    UPDATE users SET role = 'User' WHERE role IS NULL OR role NOT IN ('Admin', 'Gestor', 'User');
    ALTER TABLE users MODIFY role varchar(20) NOT NULL DEFAULT 'User', ADD CONSTRAINT fk_user_role FOREIGN KEY (role) REFERENCES roles (code) ON UPDATE CASCADE;
  `, callback)
}

exports.down = function (db, callback) {
  db.runSql(`
    ALTER TABLE users DROP FOREIGN KEY fk_user_role, DROP INDEX fk_user_role, MODIFY role varchar(20) DEFAULT 'User';
    DROP TABLE user_permissions;
    DROP TABLE role_permissions;
    DROP TABLE roles;
  `, callback)
}

exports._meta = { version: 1 }
