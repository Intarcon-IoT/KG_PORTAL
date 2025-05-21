const uuid = require("uuid");
const Booking = require("../models/booking");

const bookingCtrl = {};



bookingCtrl.createBooking = async (req, res) => {
  try {
    const { room_uuid, start_date, end_date, start_time, end_time, title, details } = req.body;

    if (!room_uuid || !start_date || !end_date || !start_time || !end_time || !title) {
      return res.status(400).json({ message: "El usuario, sala, fecha y hora, y título son obligatorios." });
    }

    const newBooking = new Booking(uuid.v4(), res.locals.user.uuid);
    newBooking.set(req.body);

    const result = await newBooking.create();

    if (result.error) {
      return res.status(500).json({ ok: false, message: "Error al crear la reserva." });
    } else {
      return res.status(201).json(result);
    }
  } catch (error) {
    console.error("Error en createBooking:", error); 
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};


bookingCtrl.getBookings = async (req, res) => {

console.log("getBookings params: ", req.query);
const filter = req.query;

  const booking = new Booking();
  const result = await booking.list(filter);

  if (result.error) {
    res.json({ ok: false, message: "Error al obtener las reservas" });
  } else {
    res.json(result);
  }
};

//TODO
bookingCtrl.getBookingsByRoomAndDay = async (req, res) => {
  const room_uuid = req.params.room_uuid;
  const date = req.params.date;

  const booking = new Booking();
  const filter = { 'room_uuid': room_uuid, 'start_date': date };
  const result = await booking.read(filter);

  if (result.error) {
    return res.json({ ok: false, message: "Error al obtener las reservas" });
  } else {
    return res.json(result);
  }
}

bookingCtrl.getBooking = async (req, res) => {
  const uuid = req.params.uuid;

  let booking = new Booking(uuid);
  const result = await booking.read();

  if (result.error) {
    return res.json({ ok: false, message: "Error al obtener la reserva" });
  } else {
    return res.json(result);
  }
};


bookingCtrl.getBookingByUser = async (req, res) => {
  const user_uuid = req.params.user_uuid;

  const booking = new Booking();
  const filter = { 'user_uuid': user_uuid };
  const result = await booking.read(filter);

  if (result.error) {
    return res.json({ ok: false, message: "Error al obtener las reservas del usuario" });
  } else {
    return res.json(result);
  }
};


//TODO: que solo los dueños o admin puedan editar y que dguarde lo anterior si no se cambia. 
bookingCtrl.editBooking = async (req, res) => {
  const uuid = req.params.uuid;

  let booking = new Booking(uuid);
  booking.set(req.body);  
  const result = await booking.update();

  if (result.error) {
    return res.json({ ok: false, message: "Error al actualizar la reserva" });
  } else {
    return res.json(result);
  }
};


bookingCtrl.deleteBooking = async (req, res) => {
  const uuid = req.params.uuid;

  let booking = new Booking(uuid);
  const result = await booking.delete();

  if (result.error) {
    return res.json({ ok: false, message: "Error al eliminar la reserva" });
  } else {
    return res.json({ ok: true, message: "Reserva eliminada correctamente" });
  }
};

module.exports = bookingCtrl;
