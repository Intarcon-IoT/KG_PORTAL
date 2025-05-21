'use strict';

var dbm;
var type;
var seed;

exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = async function(db) {
  const sql = `
    ALTER TABLE kibooking_bookings ADD CONSTRAINT fk_user FOREIGN KEY (user_uuid) REFERENCES kibooking_users(uuid);
    ALTER TABLE kibooking_bookings ADD CONSTRAINT fk_room FOREIGN KEY (room_uuid) REFERENCES kibooking_rooms(uuid);
    ALTER TABLE kibooking_rooms ADD CONSTRAINT fk_facilities FOREIGN KEY (facility_uuid) REFERENCES kibooking_facilities(uuid);
  `;

  await db.runSql(sql);
  console.log("MIGRATE OK => Create foreign keys");
};

exports._meta = {
  version: 1
};