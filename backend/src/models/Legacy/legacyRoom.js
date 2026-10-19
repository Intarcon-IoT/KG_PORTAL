const mysqlAdapter = require("../../utils/mysqlAdapter");
const Booking = require("../booking");
const moment = require('moment');

class LegacyRoom {
  constructor(uuid) {
    this.uuid = uuid;
    this.name = "";
    this.capacity = 0;
    this.facility_uuid = "";
    this.api_token = "";
  }

  read() {
    let data = [];
    let sql = `SELECT r.uuid, r.name, r.api_token, f.color
                    FROM rooms r
                    LEFT JOIN facilities f ON r.facility_uuid = f.uuid
                      WHERE r.uuid = '${this.uuid}'`;

    return mysqlAdapter.query(sql, data);
  };

  async getCurrentInfoRoom() {
    const room = await this.read();

    const booking = new Booking();
    const bookings = await booking.list({
      room_uuid: this.uuid,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0]
    });

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const current_date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const current_time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    let currentBooking = null;
    let nextBooking = null;

    // Helper to compare "HH:MM:SS" strings lexicographically
    const lt = (a, b) => a < b;

    for (let i = 0; i < bookings.length; i++) {
      const b = bookings[i];
      const { start_time: st, end_time: et, title, name: usr } = b;

      // 3a) Is this the ongoing meeting?
      if (!currentBooking && st <= current_time && current_time < et) {
        currentBooking = { 
          start_time: moment(st, 'HH:mm:ss').format('HH:mm'), 
          end_time: moment(et, 'HH:mm:ss').format('HH:mm'), 
          title, 
          name: usr 
        };

        // 3b) Next is simply the very next item in the array (if present)
        const nx = bookings[i + 1];
        if (nx) {
          nextBooking = {
            start_time: moment(nx.start_time, 'HH:mm:ss').format('HH:mm'),
            end_time: moment(nx.end_time, 'HH:mm:ss').format('HH:mm'),
            title: nx.title,
            name: nx.name
          };
        }
        break;
      }

      // 3c) Otherwise, if a future meeting, track the soonest one
      else if (st > current_time) {
        if (!nextBooking || lt(st, nextBooking.start_time)) {
          nextBooking = { 
            start_time: moment(st, 'HH:mm:ss').format('HH:mm'),
            end_time: moment(et, 'HH:mm:ss').format('HH:mm'), 
            title, 
            name: usr };
        }
      }
    }

    return {
      name: room[0].name,
      uuid: room[0].uuid,
      color: parseInt(room[0].color.slice(1), 16),
      current_date,
      current_time,
      current_booking: currentBooking,
      next_booking: nextBooking
    };
  }

  async checkToken(token) {
    const room = await this.read({ uuid: this.uuid });

    if (room.length > 0 && room[0].api_token === token) {
      return true;
    } else {
      return false;
    }
  }
}

module.exports = LegacyRoom;
