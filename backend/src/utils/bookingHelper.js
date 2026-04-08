const Room = require("../models/room");
const User = require("../models/user");

const {
  sendBookingStatusEmail,
  sendOverlappingRejectedEmails,
} = require("./statusEmailHelper");

const handleStatusChange = async ({ booking, previousStatus }) => {
  const newStatus = booking.status;

  if (newStatus === previousStatus) return;

  if (!["Approved", "Rejected"].includes(newStatus)) {
    throw new Error("Estado no válido");
  }

  if (newStatus === "Approved") {
    const isAvailable = await booking.validRange();
    if (!isAvailable) {
      throw new Error(
        "No se puede aprobar la reserva porque se solapa con otra ya confirmada"
      );
    }
  }

  const userResult = await new User(booking.user_uuid).read();
  if (!userResult?.length) throw new Error("Usuario no encontrado");

  const roomResult = await new Room(booking.room_uuid).read();
  if (!roomResult?.length) throw new Error("Sala no encontrada");

  const userData = userResult[0];
  const roomName = roomResult[0].name;

  if (newStatus === "Approved") {
    const overlappingBookings = await booking.rejectOverlapping();
    await sendOverlappingRejectedEmails(overlappingBookings);
  }
  sendBookingStatusEmail({
    user: userData,
    booking,
    roomName,
    status: newStatus,
  }).catch((err) =>
    console.error("Error enviando email:", err)
  );
};

module.exports = {
  handleStatusChange,
};
