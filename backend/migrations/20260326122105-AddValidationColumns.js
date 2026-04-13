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
    ALTER TABLE kibooking_rooms 
    ADD COLUMN needsValidation TINYINT(1) DEFAULT 0 AFTER capacity;

    ALTER TABLE kibooking_bookings 
    ADD COLUMN status VARCHAR(20) DEFAULT 'Pending' AFTER details;`;
  
  db.runSql(sql, callback);
};

exports.down = function (db, callback) {
  const sql = `
    ALTER TABLE kibooking_rooms DROP COLUMN needsValidation;
    ALTER TABLE kibooking_bookings DROP COLUMN status;`;
  
  db.runSql(sql, callback);
};

exports._meta = {
  version: 1
};
