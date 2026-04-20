'use strict';

var dbm;
var type;
var seed;

exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function (db, callback) {
  const sql = `

    -- TENANTS
    CREATE TABLE kibooking_tenants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(36) UNIQUE,
      name VARCHAR(100) NOT NULL,
      create_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_ts TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
    );

    INSERT INTO kibooking_tenants (uuid, name) VALUES
      (UUID(), 'Keyter'),
      (UUID(), 'Intarcon'),
      (UUID(), 'Genaq'),
      (UUID(), 'KIO'),
      (UUID(), 'Kiconex');

    -- USERS -> TENANT + ROLE
    ALTER TABLE kibooking_users
    ADD COLUMN tenant_uuid VARCHAR(36) NULL AFTER uuid,
    ADD COLUMN role VARCHAR(20) DEFAULT 'User' AFTER isAdmin;

    -- Migrar datos antes de eliminar isAdmin
    UPDATE kibooking_users
    SET role = 'Admin'
    WHERE isAdmin = 1;

    -- Mapear tenant_uuid en base al mail
    UPDATE kibooking_users u
    JOIN kibooking_tenants t
      ON t.name = CASE
        -- caso especial
        WHEN LOWER(SUBSTRING_INDEX(SUBSTRING_INDEX(u.mail, '@', -1), '.', 1)) = 'keyter-intarcon'
          THEN 'KIO'
        
        -- casos normales
        WHEN LOWER(SUBSTRING_INDEX(SUBSTRING_INDEX(u.mail, '@', -1), '.', 1)) = 'keyter'
          THEN 'Keyter'
        WHEN LOWER(SUBSTRING_INDEX(SUBSTRING_INDEX(u.mail, '@', -1), '.', 1)) = 'intarcon'
          THEN 'Intarcon'
        WHEN LOWER(SUBSTRING_INDEX(SUBSTRING_INDEX(u.mail, '@', -1), '.', 1)) = 'genaq'
          THEN 'Genaq'
        WHEN LOWER(SUBSTRING_INDEX(SUBSTRING_INDEX(u.mail, '@', -1), '.', 1)) = 'kiconex'
          THEN 'Kiconex'
      END
    SET u.tenant_uuid = t.uuid;
    
    -- Eliminar isAdmin
    ALTER TABLE kibooking_users
    DROP COLUMN isAdmin;

    -- Agregar constraint
    ALTER TABLE kibooking_users
    ADD CONSTRAINT fk_user_tenant
    FOREIGN KEY (tenant_uuid)
    REFERENCES kibooking_tenants(uuid);

  `;
  
  db.runSql(sql, callback);
};

exports.down = function (db, callback) {
  const sql = `

    -- USERS
    ALTER TABLE kibooking_users
    DROP FOREIGN KEY fk_user_tenant;

    ALTER TABLE kibooking_users
    ADD COLUMN isAdmin TINYINT(1) DEFAULT 0 AFTER uuid;

    -- Restaurar datos desde role
    UPDATE kibooking_users
    SET isAdmin = 1
    WHERE role = 'Admin';

    ALTER TABLE kibooking_users
    DROP COLUMN tenant_uuid,
    DROP COLUMN role;

    -- TENANTS
    DROP TABLE kibooking_tenants;

  `;
  
  db.runSql(sql, callback);
};

exports._meta = {
  version: 1
};
