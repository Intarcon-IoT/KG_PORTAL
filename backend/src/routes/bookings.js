const { Router } = require("express");
const router = Router();

const {
  getBookings, 
  getBooking, 
  createBooking, 
  createBulkBookings,
  editBooking, 
  deleteBooking
} = require("../controllers/booking_ctrl");

const { AuthMiddleware } = require('../middlewares/authMiddleware');

router.use(AuthMiddleware);

router.route("/")
  .get(getBookings)
  .post(createBooking);

router.post("/bulk", createBulkBookings);

router.route("/:uuid")
  .get(getBooking)
  .put(editBooking)
  .delete(deleteBooking);

module.exports = router;
