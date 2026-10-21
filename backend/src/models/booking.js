const mysqlAdapter = require("../utils/mysqlAdapter");

// Las fechas llegan como YYYY-MM-DD (frontend), Date (mysql2, medianoche UTC) o ISO completas (eco de la API)
const toDay = v => v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) ? v.slice(0, 10) : v
const toMinutes = time => String(time).split(':').slice(0, 2).reduce((h, m) => h * 60 + Number(m), 0)
// V8 convierte 2026-02-31 en 3 de marzo en vez de Invalid Date: se comprueba que el día exista
const isRealDay = day => { const [y, m, d] = day.split('-').map(Number); const dt = new Date(y, m - 1, d); return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d }

class Booking {
  constructor(uuid, user_uuid = "") {
    this.uuid = uuid;
    this.user_uuid = user_uuid;
    this.room_uuid = "";
    this.start_date = "";
    this.end_date = "";
    this.start_time = "";
    this.end_time = "";
    this.title = "";
    this.details = "";
    this.status = "Pending";
  }

  set(data) {
    this.room_uuid = data.room_uuid;
    this.start_date = toDay(data.start_date);
    this.end_date = toDay(data.end_date);
    this.start_time = data.start_time;
    this.end_time = data.end_time;
    this.title = data.title;
    this.details = data.details;
    this.status = data.status;
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
      details: this.details,
      status: this.status
    };
    return data;
  }

  getUpdatableFields() {
    const { uuid, user_uuid, ...data } = this.get();
    return data;
  }

  async create() {
    const data = this.get();
    const result = await mysqlAdapter.query(
      "INSERT INTO bookings set ? ",
      data
    );
    return result;
  }

  async update(isAdmin = false) {
    const data = this.getUpdatableFields();

    const [room] = await mysqlAdapter.query(
      "SELECT needsValidation FROM rooms WHERE uuid = ?",
      [this.room_uuid]
    );

    if (room && room.needsValidation === 1 && !isAdmin) {
      data.status = "Pending";
      this.status = "Pending";
    }

    const result = await mysqlAdapter.query(
      "UPDATE bookings set ? WHERE uuid = ?",
      [data, this.uuid]
    );
    return result;
  }

  async delete() {
    const result = await mysqlAdapter.query(
      "DELETE FROM bookings WHERE uuid = ?",
      [this.uuid]
    );
    return result;
  }

  async list(filter = {}) {
    let data = [];
    let sql = `SELECT b.uuid, b.user_uuid, b.room_uuid, b.start_date, b.end_date, b.start_time, b.end_time, b.title, b.details, b.status, b.updated_ts, u.name, u.tenant_uuid 
                                            FROM bookings AS b 
                                            LEFT JOIN users AS u ON u.uuid = b.user_uuid 
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

    if (filter.status_in) {
      let statusIn = filter.status_in;
      if (typeof statusIn === "string") {
        try {
          statusIn = JSON.parse(statusIn);
        } catch {
          statusIn = statusIn.split(",").map((s) => s.trim());
        }
      }

      if (!Array.isArray(statusIn)) {
        statusIn = [statusIn];
      }

      if (statusIn.length > 0) {
        sql += " AND b.status IN (?)";
        data.push(statusIn);
      } else {
        sql += " AND b.status != 'Rejected'";
      }
    } else {
      sql += " AND b.status != 'Rejected'";
    }

    if (filter.tenant_uuid) {
      sql += " AND u.tenant_uuid = ?";
      data.push(filter.tenant_uuid);
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
      "SELECT b.uuid, b.user_uuid, b.room_uuid, b.start_date, b.end_date, b.start_time, b.end_time, b.title, b.details, b.status, b.updated_ts, u.tenant_uuid FROM bookings b LEFT JOIN users u ON b.user_uuid = u.uuid WHERE 1";

    if (Object.keys(filter).length === 0) {
      sql += " AND b.uuid = ?";
      data.push(this.uuid);
    }

    if (filter.user_uuid) {
      sql += " AND b.user_uuid = ?";
      data.push(filter.user_uuid);
    }

    return mysqlAdapter.query(sql, data);
  }

  // allowPast: la fecha y la hora no cambian (p. ej. aprobar o rechazar); skipOverlap: la reserva queda rechazada
  async validate({ allowPast = false, skipOverlap = false } = {}) {
    // Validar campos obligatorios 
      if (!this.room_uuid || !this.start_date || !this.end_date || !this.start_time || !this.end_time || !this.title) {
        return {
          valid: false,
          error: 'La sala, fecha, hora, y título son obligatorios'
        };
      }
    // set() ya normaliza a YYYY-MM-DD; aquí solo se acepta ese formato
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(this.start_date) || !dateRegex.test(this.end_date) || !isRealDay(this.start_date) || !isRealDay(this.end_date)) {
      return {
        valid: false,
        error: 'El formato de fecha debe ser YYYY-MM-DD'
      };
    }
    // Validar formato de hora (HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
    if (!timeRegex.test(this.start_time) || !timeRegex.test(this.end_time)) {
      return {
        valid: false,
        error: 'El formato de hora debe ser HH:MM (24h)'
      };
    }
    // Validar longitud máxima del título
    if (this.title.length > 255) {
      return {
        valid: false,
        error: 'El título no puede exceder los 255 caracteres'
      };
    }

    const startDateTime = new Date(`${this.start_date}T${this.start_time}`);
    const endDateTime = new Date(`${this.end_date}T${this.end_time}`);
    const now = new Date();
    now.setSeconds(0);
    now.setMilliseconds(0);

    // Invalid Date haría pasar todas las comparaciones siguientes
    if (isNaN(startDateTime) || isNaN(endDateTime)) return { valid: false, error: 'La fecha u hora no es válida' }
    // Una reserva es una franja diaria (así la interpreta validRange): fin posterior al inicio dentro del día
    if (toMinutes(this.start_time) >= toMinutes(this.end_time)) return { valid: false, error: 'La hora de fin debe ser posterior a la de inicio' }

    if (startDateTime > endDateTime) {
      return {
        valid: false,
        error: 'La fecha de inicio no puede ser posterior a la fecha de fin'
      };
    }
    if (!allowPast && startDateTime < now) {
      return {
        valid: false,
        error: 'La fecha de inicio no puede ser anterior a la fecha actual'
      };
    }
    const validRange = skipOverlap || await this.validRange();
    if (!validRange) {
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
        bookings 
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
        AND (
          status = 'Approved'                /* Booking is already approved */
          OR 
          (status = 'Pending' AND user_uuid = ?) /* Current user already has a pending booking */
        )
        AND uuid != ?               /* Exclude current booking in case of edit */
    `;

    const queryParams = [
      roomUuid, 
      newStartDate, newEndDate,  // caso 1-1 -> Fecha inicio existente dentro de nueva
      newStartDate, newEndDate,  // caso 1-2 -> Fecha fin existente dentro de nueva
      newStartDate,              // caso 1-3 -> Nueva dentro de existente
      newEndTime, newStartTime,  // caso 2-1 -> Hora inicio
      newEndTime, newStartTime,  // caso 2-2 -> Hora fin
      newStartTime, newEndTime,  // caso 2-3 -> Nueva dentro de existente
      newStartTime, newEndTime,  // caso 2-4 -> Existente dentro de nueva
      this.user_uuid,            // Controlar que no existan reservas pendientes del mismo usuario
      this.uuid  // Excluir la reserva actual en caso de edición
    ];

    const result = await mysqlAdapter.query(sql, queryParams);
    
    // Devuelve true si no hay conflictos
    return result.length === 0;
  }

  async rejectOverlapping() {
    const sqlSelect = `
      SELECT uuid, user_uuid, room_uuid, start_date, end_date, start_time, end_time, title
      FROM bookings
      WHERE room_uuid = ?
        AND uuid != ?
        AND status = 'Pending'
        AND (
          ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?) OR (? BETWEEN start_date AND end_date))
          AND
          (
            (start_time < ? AND end_time > ?) OR
            (start_time < ? AND end_time > ?) OR
            (start_time <= ? AND end_time >= ?) OR
            (? <= start_time AND ? >= end_time)
          )
        )
    `;

    const selectParams = [
      this.room_uuid,
      this.uuid,
      this.start_date, this.end_date,
      this.start_date, this.end_date,
      this.start_date,
      this.end_time, this.start_time,
      this.end_time, this.start_time,
      this.start_time, this.end_time,
      this.start_time, this.end_time
    ];

    const overlappingBookings = await mysqlAdapter.query(sqlSelect, selectParams);

    const sqlUpdate = `
      UPDATE bookings
      SET status = 'Rejected'
      WHERE room_uuid = ?
        AND uuid != ?
        AND status = 'Pending'
        AND (
          ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?) OR (? BETWEEN start_date AND end_date))
          AND
          (
            (start_time < ? AND end_time > ?) OR
            (start_time < ? AND end_time > ?) OR
            (start_time <= ? AND end_time >= ?) OR
            (? <= start_time AND ? >= end_time)
          )
        )
    `;

    await mysqlAdapter.query(sqlUpdate, selectParams);

    return overlappingBookings;
  }
}

module.exports = Booking;
