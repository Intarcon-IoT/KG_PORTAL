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
    `ALTER TABLE kibooking_rooms ADD COLUMN api_token VARCHAR(32) NULL AFTER capacity;`,
    callback
  );
};

exports._meta = {
  version: 1
};
