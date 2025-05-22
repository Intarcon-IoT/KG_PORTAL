const mysqlAdapter = require("../utils/mysqlAdapter");

class Booking {

  constructor(uuid, user_uuid) {
    this.uuid = uuid;
    this.user_uuid = user_uuid;
    this.room_uuid = "";
    this.start_date = "";
    this.end_date = "";
    this.start_time = "";
    this.end_time = "";
    this.title = "";
    this.details = "";
  }

  set(data) {
    this.room_uuid = data.room_uuid;
    this.start_date = data.start_date;
    this.end_date = data.end_date;
    this.start_time = data.start_time;
    this.end_time = data.end_time;
    this.title = data.title;
    this.details = data.details;
  }

  get() {
    const data = {
      uuid: this.uuid,
      user_uuid: this.user_uuid,
      room_uuid: this.room_uuid,
      start_date: this.start_date,
      end_date: this.end_date,
      start_time: this.start_time,
      end_time: this.end_time,
      title: this.title,
      details: this.details
    };
    return data;
  }
  
  async create() {
    const data = this.get();
    const result = await mysqlAdapter.query("INSERT INTO kibooking_bookings set ? ", data);
    return result;
  }

  async update() {
    const data = this.get();
    const result = await mysqlAdapter.query("UPDATE kibooking_bookings set ? WHERE uuid = ?", [data, this.uuid]);
    return result;
  }

  async delete() {
    const result = await mysqlAdapter.query("DELETE FROM kibooking_bookings WHERE uuid = ?", [this.uuid]);
    return result;
  }

  async list(filter = {}) {
    let data = [];
    let sql = `SELECT b.uuid, b.user_uuid, b.room_uuid, b.start_date, b.end_date, b.start_time, b.end_time, b.title, b.details, u.name 
                                            FROM kibooking_bookings AS b 
                                            LEFT JOIN kibooking_users AS u ON u.uuid = b.user_uuid 
                                            WHERE 1`;
    // FILTER
    if (filter.user_uuid) {
      sql += " AND b.user_uuid = ?";
      data.push(filter.user_uuid);
    }
    if (filter.room_uuid) {
      sql += " AND b.room_uuid = ?";
      data.push(filter.room_uuid);
    }
    if (filter.start_date) {
      sql += " AND b.start_date = ?";
      data.push(filter.start_date);
    }
    if (filter.end_date) {
      sql += " AND b.end_date = ?";
      data.push(filter.end_date);
    }
    if (filter.start_time) {
      sql += " AND b.start_time = ?";
      data.push(filter.start_time);
    }
    if (filter.end_time) {
      sql += " AND b.end_time = ?";
      data.push(filter.end_time);
    }

    // RANGE FILTER
    if (filter.from_date) {
      sql += " AND b.start_date >= ?";
      data.push(filter.from_date);
    }
    if (filter.to_date) {
      sql += " AND b.start_date <= ?";
      data.push(filter.to_date);
    }
    if (filter.from_time) {
      sql += " AND b.start_time >= ?";
      data.push(filter.from_time);
    }
    if (filter.to_time) {
      sql += " AND b.start_time <= ?";
      data.push(filter.to_time);
    }

    return mysqlAdapter.query(sql, data);
  }

  read(filter = {}) {
    let data = [];
    let sql = "SELECT uuid, user_uuid, room_uuid, start_date, end_date, start_time, end_time, title, details FROM kibooking_bookings WHERE 1";
    
    if (Object.keys(filter).length === 0) {
      sql += " AND uuid = ?";
      data.push(this.uuid);
    }

    if (filter.user_uuid) {
      sql += " AND user_uuid = ?";
      data.push(filter.user_uuid);
    }

    return mysqlAdapter.query(sql, data);
  };
}

module.exports = Booking;
