'use strict';

var dbm;
var type;
var seed;

exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db, callback) {
  db.runSql( 
    `ALTER TABLE kibooking_bookings DROP FOREIGN KEY fk_user;
     ALTER TABLE kibooking_bookings ADD CONSTRAINT fk_user
        FOREIGN KEY (user_uuid)
        REFERENCES kibooking_users(uuid)
        ON DELETE CASCADE
        ON UPDATE CASCADE;`,
    callback
  );
};

exports._meta = {
  "version": 1
};
