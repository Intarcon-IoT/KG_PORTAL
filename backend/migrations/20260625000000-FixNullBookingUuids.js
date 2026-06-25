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
    'UPDATE kibooking_bookings SET uuid = UUID() WHERE uuid IS NULL',
    callback
  );
};

exports.down = function (db, callback) {
  callback();
};

exports._meta = {
  version: 1
};
