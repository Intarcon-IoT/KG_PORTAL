const mailerAdapter = require("./mailerAdapter");
const { bookingStatusTemplate } = require("./emailTemplates/bookingStatusTemplate");
const { BOOKING_STATUS } = require("./constants");

const User = require("../models/user");
const Room = require("../models/room");

const sendBookingStatusEmail = async ({ user, booking, roomName, status }) => {
  const template = bookingStatusTemplate({
    nombre: user.name,
    status,
    booking: {
      ...booking,
      room_name: roomName,
    },
  });

  await mailerAdapter.sendMail({
    to: user.mail,
    template,
  });
};

const sendOverlappingRejectedEmails = async (overlappingBookings) => {
  for (const b of overlappingBookings) {
    try {
      const userResult = await new User(b.user_uuid).read();
      if (!userResult || userResult.length === 0) continue;

      const roomResult = await new Room(b.room_uuid).read();
      if (!roomResult || roomResult.length === 0) continue;

      await sendBookingStatusEmail({
        user: userResult[0],
        booking: b,
        roomName: roomResult[0].name,
        status: BOOKING_STATUS.REJECTED,
      });
    } catch (err) {
      console.error(
        "Error enviando email de rechazo para reserva solapada:",
        err
      );
    }
  }
};

module.exports = {
  sendBookingStatusEmail,
  sendOverlappingRejectedEmails,
};
