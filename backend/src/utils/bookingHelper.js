const Room = require("../models/room");
const User = require("../models/user");
const { BOOKING_STATUS } = require("./constants");

const {
  sendBookingStatusEmail,
  sendOverlappingRejectedEmails,
} = require("./statusEmailHelper");

const handleStatusCheck = async ({ booking, previousStatus }) => {
  const newStatus = booking.status;

  if (newStatus === previousStatus) return;

  if (![BOOKING_STATUS.APPROVED, BOOKING_STATUS.REJECTED].includes(newStatus)) {
    throw new Error("Estado no válido");
  }

  if (newStatus === BOOKING_STATUS.APPROVED) {
    const isAvailable = await booking.validRange();
    if (!isAvailable) {
      throw new Error(
        "No se puede aprobar la reserva porque se solapa con otra ya confirmada",
      );
    }
  }

  const userResult = await new User(booking.user_uuid).read();
  if (!userResult?.length) throw new Error("Usuario no encontrado");

  const roomResult = await new Room(booking.room_uuid).read();
  if (!roomResult?.length) throw new Error("Sala no encontrada");

  const userData = userResult[0];
  const roomName = roomResult[0].name;

  if (newStatus === BOOKING_STATUS.APPROVED) {
    const overlappingBookings = await booking.rejectOverlapping();
    await sendOverlappingRejectedEmails(overlappingBookings);
  }
  sendBookingStatusEmail({
    user: userData,
    booking,
    roomName,
    status: newStatus,
  }).catch((err) => console.error("Error enviando email:", err));
};

module.exports = {
  handleStatusCheck,
};
