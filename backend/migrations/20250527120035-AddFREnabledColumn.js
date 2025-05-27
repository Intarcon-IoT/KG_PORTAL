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
  db.runSql(
    `ALTER TABLE kibooking_rooms ADD COLUMN enabled BOOLEAN DEFAULT TRUE AFTER uuid;
     ALTER TABLE kibooking_facilities ADD COLUMN enabled BOOLEAN DEFAULT TRUE AFTER uuid;`,
    callback
  );
};

exports._meta = {
  version: 1
};