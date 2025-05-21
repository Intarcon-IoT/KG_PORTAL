'use strict';

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db, callback) {
  db.createTable('kibooking_users', {
    id: { type: 'int', primaryKey: true, autoIncrement: true },
    uuid: { type: 'varchar', length:36, unique: true },
    user: { type: 'varchar', length: 50 },
    mail: { type: 'varchar', length: 100, unique: true },
    name: { type: 'varchar', length: 100 },
    password: { type: 'varchar', length: 255 },
    isAdmin: { type: 'boolean', defaultValue: false },
    create_ts: { type: 'timestamp', defaultValue: new String('CURRENT_TIMESTAMP()'), notNull: true },
  }, callback);
  console.log("MIGRATE OK => Create users table");
};

exports._meta = {
  "version": 1
};
