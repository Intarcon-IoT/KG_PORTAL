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

exports.up = async function(db) {
  const sql = `
    ALTER TABLE kibooking_users ADD COLUMN updated_ts TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;
    ALTER TABLE kibooking_bookings ADD COLUMN updated_ts TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;
    ALTER TABLE kibooking_rooms ADD COLUMN updated_ts TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;
    ALTER TABLE kibooking_facilities ADD COLUMN updated_ts TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;
  `;

  await db.runSql(sql);
  console.log("MIGRATE OK => Create alter table, tables with updated_ts field");
};

exports._meta = {
  "version": 1
};
