const uuid = require("uuid");
const Booking = require("../models/booking");
const Room = require("../models/room");
const { handleStatusCheck } = require("../utils/bookingHelper");
const bookingCtrl = {};

bookingCtrl.createBooking = async (req, res) => {
  try {
    const newBooking = new Booking(uuid.v4(), res.locals.user.uuid);
    newBooking.set(req.body);

    const room = new Room(newBooking.room_uuid);
    const roomData = await room.read();

    if (!roomData || roomData.length === 0) {
      return res
        .status(404)
        .json({ ok: false, message: "La sala especificada no existe." });
    }

    if (res.locals.user.isAdmin || roomData[0].needsValidation === 0) {
      newBooking.status = "Approved";
    } else {
      newBooking.status = "Pending";
    }

    const validation = await newBooking.validate();

    if (!validation.valid) {
      return res.status(400).json({ message: validation.error });
    }

    const result = await newBooking.create();

    if (result.error) {
      return res
        .status(500)
        .json({ ok: false, message: "Error al crear la reserva." });
    } else {
      if (newBooking.status === "Approved") {
        await newBooking.rejectOverlapping();
      }

      return res.status(201).json({
        ok: true,
        message:
          newBooking.status === "Approved"
            ? "Reserva creada y confirmada correctamente."
            : "Reserva creada. Pendiente de validación por un administrador.",
        status: newBooking.status,
      });
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
  const booking = new Booking(uuid);

  const saved = await booking.read();

  if (!saved || saved.length === 0) {
    return res
      .status(404)
      .json({ ok: false, message: "Reserva no encontrada" });
  }
  if (saved[0].user_uuid !== res.locals.user.uuid && !res.locals.user.isAdmin) {
    return res.status(403).json({
      ok: false,
      message: "No tienes permiso para editar esta reserva",
    });
  }

  if (
    !res.locals.user.isAdmin &&
    req.body.status !== undefined &&
    req.body.status !== saved[0].status
  ) {
    return res.status(403).json({
      ok: false,
      message: "No puedes cambiar el estado de la reserva",
    });
  }

  booking.user_uuid = saved[0].user_uuid;
  const previousStatus = saved[0].status;
  const merged = { ...saved[0], ...req.body };
  booking.set(merged);

  const validation = await booking.validate();
  if (!validation.valid) {
    return res.status(400).json({ message: validation.error });
  }

  try {
    await handleStatusCheck({
      booking,
      previousStatus,
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: error.message,
    });
  }

  const result = await booking.update(res.locals.user.isAdmin);

  if (result.error) {
    return res.json({ ok: false, message: "Error al actualizar la reserva" });
  } else {
    return res.json({
      ok: true,
      message:
        booking.status === "Pending"
          ? "Reserva actualizada y pendiente de validación por un administrador."
          : "Reserva actualizada correctamente.",
      status: booking.status,
    });
  }
};

bookingCtrl.deleteBooking = async (req, res) => {
  const uuid = req.params.uuid;

  let booking = new Booking(uuid);
  const saved = await booking.read();

  if (!saved || saved.length === 0) {
    return res
      .status(404)
      .json({ ok: false, message: "Reserva no encontrada" });
  }
  if (saved[0].user_uuid !== res.locals.user.uuid && !res.locals.user.isAdmin) {
    return res.status(403).json({
      ok: false,
      message: "No tienes permiso para eliminar esta reserva",
    });
  }

  const result = await booking.delete();

  if (result.affectedRows === 0) {
    return res.json({ ok: false, message: "Error al eliminar la reserva" });
  } else {
    return res.json({ ok: true, message: "Reserva eliminada correctamente" });
  }
};

module.exports = bookingCtrl;
