const uuid = require("uuid");
const Booking = require("../models/booking");
const Room = require("../models/room");
const mysqlAdapter = require("../utils/mysqlAdapter");
const { handleStatusCheck } = require("../utils/bookingHelper");
const thirdPartyService = require("../utils/thirdPartyService");
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
      if(roomData[0].needsValidation === 0) {
        const { user_uuid, status, ...cleanBooking } = newBooking;
        await thirdPartyService.syncThirdParty(cleanBooking, 'insert');
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
  const room = new Room(saved[0].room_uuid);
  const roomData = await room.read();
  
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
    if(roomData[0].needsValidation === 0) {
      await thirdPartyService.syncThirdParty(req.body, 'update');
    }
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
  const room = new Room(saved[0].room_uuid);
  const roomData = await room.read();
  const { user_uuid, updated_ts, status, ...cleanBooking } = saved[0];

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
    if(roomData[0].needsValidation === 0) {
      await thirdPartyService.syncThirdParty(cleanBooking, 'delete');
    }
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
        const newBooking = new Booking(uuid.v4(), res.locals.user.uuid);
        newBooking.set(bookingData);

        const room = new Room(newBooking.room_uuid);
        const roomData = await room.read({});

        if (!roomData || roomData.length === 0) {
          const error = new Error("La sala especificada no existe.");
          error.isValidationError = true;
          throw error;
        }

        if (res.locals.user.isAdmin || roomData[0].needsValidation === 0) {
          newBooking.status = "Approved";
        } else {
          newBooking.status = "Pending";
        }

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
          if (newBooking.status === "Approved") {
            await newBooking.rejectOverlapping();
          }
          const { user_uuid, status, ...cleanBooking } = newBooking;
          successfulBookings.push({ booking: cleanBooking, needsSync: roomData[0].needsValidation === 0 });
        }
      }
    });

    await Promise.all(
      successfulBookings
        .filter(item => item.needsSync)
        .map(item => thirdPartyService.syncThirdParty(item.booking, 'insert'))
    );
    
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
