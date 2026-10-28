const { randomUUID } = require('crypto')
const Booking = require("../models/booking");
const Room = require("../models/room");
const mysqlAdapter = require("../utils/mysqlAdapter");
const { handleStatusCheck } = require("../utils/bookingHelper");
const { BOOKING_STATUS } = require("../utils/constants");
const permissions = require('../utils/permissions')

// Quién puede tocar una reserva: su dueño; quien valida, cualquiera; quien gestiona, las aprobadas de otros
const canTouch = (user, saved) => saved.user_uuid === user.uuid || permissions.has(user, 'bookings.validate') || (permissions.has(user, 'bookings.manage') && saved.status === BOOKING_STATUS.APPROVED)

const bookingCtrl = {};

bookingCtrl.createBooking = async (req, res) => {
  try {
    const newBooking = new Booking(randomUUID(), res.locals.user.uuid);
    newBooking.set(req.body);

    const room = new Room(newBooking.room_uuid);
    const roomData = await room.read();

    if (!roomData || roomData.length === 0) {
      return res
        .status(404)
        .json({ ok: false, message: "La sala especificada no existe." });
    }

    const canAutoApprove = permissions.has(res.locals.user, 'bookings.auto_approve') || roomData[0].needsValidation === 0;
    newBooking.status = canAutoApprove ? BOOKING_STATUS.APPROVED : BOOKING_STATUS.PENDING;

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
      if (newBooking.status === BOOKING_STATUS.APPROVED) {
        await newBooking.rejectOverlapping();
      }
      return res.status(201).json({
        ok: true,
        message:
          newBooking.status === BOOKING_STATUS.APPROVED
            ? "Reserva creada y confirmada correctamente."
            : "Reserva creada. Queda pendiente de validación.",
        status: newBooking.status,
        uuid: newBooking.uuid
      });
    }
  } catch (error) {
    console.error("Error en createBooking:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

bookingCtrl.getBookings = async (req, res) => {
  const filter = req.query || {};

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
  const user = res.locals.user
  const autoApprove = permissions.has(user, 'bookings.auto_approve')
  if (!canTouch(user, saved[0])) return res.status(403).json({ ok: false, message: "No tienes permiso para editar esta reserva" })

  if (!permissions.has(user, 'bookings.validate') && req.body.status !== undefined && req.body.status !== saved[0].status) {
    return res.status(403).json({
      ok: false,
      message: "No puedes cambiar el estado de la reserva",
    });
  }

  if (autoApprove && (req.body.status === undefined || req.body.status === BOOKING_STATUS.PENDING)) {
    req.body.status = BOOKING_STATUS.APPROVED;
  }

  booking.user_uuid = saved[0].user_uuid;
  const previousStatus = saved[0].status;
  const merged = { ...saved[0], ...req.body };
  booking.set(merged);

  // Aprobar o rechazar sin mover la reserva no exige que siga en el futuro; una rechazada no compite por la sala
  const original = new Booking(uuid);
  original.set(saved[0]);
  const slot = b => [b.start_date, b.end_date, String(b.start_time).slice(0, 5), String(b.end_time).slice(0, 5)].join('|')
  const validation = await booking.validate({ allowPast: slot(booking) === slot(original), skipOverlap: booking.status === BOOKING_STATUS.REJECTED });
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

  // Quien valida conserva el estado que fija (aprobar o rechazar); el resto vuelve a Pending en salas con validación
  const result = await booking.update(autoApprove || permissions.has(user, 'bookings.validate'));

  if (result.error) {
    return res.json({ ok: false, message: "Error al actualizar la reserva" });
  } else {
    return res.json({
      ok: true,
      message:
        booking.status === BOOKING_STATUS.PENDING
          ? "Reserva actualizada. Queda pendiente de validación."
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

  if (!canTouch(res.locals.user, saved[0])) return res.status(403).json({ ok: false, message: "No tienes permiso para eliminar esta reserva" })

  const result = await booking.delete();

  if (result.affectedRows === 0) {
    return res.json({ ok: false, message: "Error al eliminar la reserva" });
  } else {
    return res.json({ ok: true, message: "Reserva eliminada correctamente" });
  }
};

bookingCtrl.createBulkBookings = async (req, res) => {
  const { bookings } = req.body;
  
  if (!Array.isArray(bookings) || bookings.length === 0) {
    return res.status(400).json({ ok: false, message: "No se proporcionaron reservas." });
  }

  const successfulBookings = [];

  try {
    await mysqlAdapter.runInTransaction(async () => {
      for (const bookingData of bookings) {
        const newBooking = new Booking(randomUUID(), res.locals.user.uuid);
        newBooking.set(bookingData);

        const room = new Room(newBooking.room_uuid);
        const roomData = await room.read({});

        if (!roomData || roomData.length === 0) {
          const error = new Error("La sala especificada no existe.");
          error.isValidationError = true;
          throw error;
        }

        const canAutoApprove = permissions.has(res.locals.user, 'bookings.auto_approve') || roomData[0].needsValidation === 0;
        newBooking.status = canAutoApprove ? BOOKING_STATUS.APPROVED : BOOKING_STATUS.PENDING;

        const validation = await newBooking.validate();
        if (!validation.valid) {
          const error = new Error(validation.error);
          error.isValidationError = true;
          throw error;
        }

        const result = await newBooking.create();
        if (result.error) {
          const error = new Error("Error al crear la reserva.");
          error.isValidationError = true;
          throw error;
        } else {
          if (newBooking.status === BOOKING_STATUS.APPROVED) {
            await newBooking.rejectOverlapping();
          }
          successfulBookings.push(newBooking.uuid);
        }
      }
    });

    return res.status(201).json({
      ok: true,
      message: `Se han creado ${successfulBookings.length} reservas correctamente.`,
      count: successfulBookings.length
    });

  } catch (error) {
    if (error.isValidationError) {
      return res.status(400).json({ 
        ok: false, 
        message: error.message
      });
    }
    
    console.error("Error en createBulkBookings:", error);
    return res.status(500).json({ ok: false, message: "Error interno del servidor." });
  }
};

module.exports = bookingCtrl;
