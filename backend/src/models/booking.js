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
    const result = await mysqlAdapter.query(
      "INSERT INTO kibooking_bookings set ? ",
      data
    );
    return result;
  }

  async update() {
    const data = this.get();
    delete data.uuid;
    delete data.user_uuid;

    const result = await mysqlAdapter.query(
      "UPDATE kibooking_bookings set ? WHERE uuid = ?",
      [data, this.uuid]
    );
    return result;
  }

  async delete() {
    const result = await mysqlAdapter.query(
      "DELETE FROM kibooking_bookings WHERE uuid = ?",
      [this.uuid]
    );
    return result;
  }

  async list(filter = {}) {
    let data = [];
    let sql = `SELECT b.uuid, b.user_uuid, b.room_uuid, b.start_date, b.end_date, b.start_time, b.end_time, b.title, b.details, b.updated_ts, u.name 
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

    sql += " ORDER BY b.start_date, b.start_time";

        // LIMIT FILTER
    if (filter.first_only) {
      sql += " LIMIT 1";
    }

    return mysqlAdapter.query(sql, data);
  }

  read(filter = {}) {
    let data = [];
    let sql =
      "SELECT uuid, user_uuid, room_uuid, start_date, end_date, start_time, end_time, title, details, updated_ts FROM kibooking_bookings WHERE 1";

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

  validate() {

    if (!this.room_uuid || !this.start_date || !this.end_date || !this.start_time || !this.end_time) {
      return {
        valid: false,
        error: 'El usuario, sala, fecha, hora, y título son obligatorios'
      };
    }
    if (new Date(this.start_date) > new Date(this.end_date)) {
      return {
        valid: false,
        error: 'La fecha de inicio no puede ser posterior a la fecha de fin'
      };
    }
    if (this.start_time >= this.end_time) {
      return {
        valid: false,
        error: 'La hora de inicio no puede ser igual o posterior a la hora de fin'
      };
    }
    if (new Date(this.start_date) < new Date() || new Date(this.end_date) < new Date()) {
      return {
        valid: false,
        error: 'La fecha de inicio y de fin no pueden ser anteriores a la fecha actual'
      };
    }
    if (!this.validRange()) {
      return {
        valid: false,
        error: 'La reserva se solapa con alguna ya existente'
      };
    }
    return { valid: true };
  }

  async validRange() {
    // Usar directamente las propiedades del objeto
    const roomUuid = this.room_uuid;
    const newStartDate = this.start_date;
    const newEndDate = this.end_date;
    const newStartTime = this.start_time;
    const newEndTime = this.end_time;

    // Verificar que tenemos todos los datos necesarios
    if (!roomUuid || !newStartDate || !newEndDate || !newStartTime || !newEndTime) {
      console.error('Faltan datos necesarios para validar el rango');
      return {
        available: false,
        conflicts: [],
        error: 'Datos incompletos para realizar la validación'
      };
    }

    // Consulta para buscar solapamientos
    const sql = `
      SELECT 
        uuid, start_date, end_date, start_time, end_time, title 
      FROM 
        kibooking_bookings 
      WHERE 
        room_uuid = ? 
        AND (
          /* Caso 1: La reserva existente se solapa con la nueva reserva */
          (
            /* La fecha de inicio de la reserva existente está dentro del rango de la nueva */
            (start_date BETWEEN ? AND ?) 
            OR 
            /* La fecha de fin de la reserva existente está dentro del rango de la nueva */
            (end_date BETWEEN ? AND ?)
            OR
            /* La nueva reserva está contenida completamente en una existente */
            (? BETWEEN start_date AND end_date)
          )
          AND
          (
            /* La hora de inicio de la reserva existente está dentro del rango de la nueva */
            (start_time < ? AND end_time > ?)
            OR
            /* La hora de fin de la reserva existente está dentro del rango de la nueva */
            (start_time < ? AND end_time > ?)
            OR
            /* La nueva reserva está completamente dentro de los horarios de una existente */
            (start_time <= ? AND end_time >= ?)
            OR
            /* La nueva reserva contiene completamente a una existente */
            (? <= start_time AND ? >= end_time)
          )
        )
    `;

    const queryParams = [
      roomUuid, 
      newStartDate, newEndDate,  // caso 1-1 -> Fecha inicio existente dentro de nueva
      newStartDate, newEndDate,  // caso 1-2 -> Fecha fin existente dentro de nueva
      newStartDate,              // caso 1-3 -> Nueva dentro de existente
      newEndTime, newStartTime,  // caso 2-1 -> Hora inicio
      newEndTime, newStartTime,  // caso 2-2 -> Hora fin
      newStartTime, newEndTime,  // caso 2-3 -> Nueva dentro de existente
      newStartTime, newEndTime   // caso 2-4 -> Existente dentro de nueva
    ];

    const result = await mysqlAdapter.query(sql, queryParams);
    
    // Devuelve true si no hay conflictos
    return result.length === 0;
  }
}

module.exports = Booking;
