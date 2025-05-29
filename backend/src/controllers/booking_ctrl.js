const uuid = require("uuid");
const Booking = require("../models/booking");

const bookingCtrl = {};



bookingCtrl.createBooking = async (req, res) => {
  try {
    const newBooking = new Booking(uuid.v4(), res.locals.user.uuid);
    newBooking.set(req.body);

    const validation = newBooking.validate();

    if (!validation.valid) {
      return res.status(400).json({ message: validation.error });
    }

    const result = await newBooking.create();

    if (result.error) {
      return res.status(500).json({ ok: false, message: "Error al crear la reserva." });
    } else {
      return res.status(201).json({ ok: true, message: "Reserva creada correctamente" });
    }
  } catch (error) {
    console.error("Error en createBooking:", error); 
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};


bookingCtrl.getBookings = async (req, res) => {

const filter = req.query;

  const booking = new Booking();
  const result = await booking.list(filter);

  if (result.error) {
    res.json({ ok: false, message: "Error al obtener las reservas" });
  } else {
    res.json(result);
  }
};


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


bookingCtrl.editBooking = async (req, res) => {
  const uuid = req.params.uuid;

  let booking = new Booking(uuid);

  const saved = await booking.read();
  if (saved[0].user_uuid !== res.locals.user.uuid && !res.locals.user.isAdmin) {
    return res.status(403).json({ ok: false, message: "No tienes permiso para editar esta reserva" });
  }

  booking.set(req.body);  

  const validation = booking.validate();
  if (!validation.valid) {
    return res.status(400).json({ message: validation.error });
  }

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

  const saved = await booking.read();
  if (saved[0].user_uuid !== res.locals.user.uuid && !res.locals.user.isAdmin) {
    return res.status(403).json({ ok: false, message: "No tienes permiso para eliminar esta reserva" });
  }

  const result = await booking.delete();

  if (result.error) {
    return res.json({ ok: false, message: "Error al eliminar la reserva" });
  } else {
    return res.json({ ok: true, message: "Reserva eliminada correctamente" });
  }
};

module.exports = bookingCtrl;
