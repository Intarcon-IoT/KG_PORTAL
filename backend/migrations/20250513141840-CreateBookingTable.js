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
  db.createTable('kibooking_bookings', {
    id: { type: 'int', primaryKey: true, autoIncrement: true },
    uuid: { type: 'string', length:36, unique: true },
    user_uuid: { type: 'string', length: 36, notnull: true },
    room_uuid: { type: 'string', length: 36, notnull: true },
    start_date: { type: 'date' },
    end_date: { type: 'date' },
    start_time: { type: 'time' },
    end_time: { type: 'time' },
    title: { type: 'string', length: 100 },
    details: { type: 'text' },
    create_ts: { type: 'timestamp', defaultValue: new String('CURRENT_TIMESTAMP()'), notNull: true },
  }, callback);
  console.log("MIGRATE OK => Create booking table");
};

exports._meta = {
  "version": 1
};
