const { Router } = require("express");
const router = Router();

const {
  getRooms, getRoom, getRoomsByFacility,
  createRoom, editRoom, deleteRoom
} = require("../controllers/room_ctrl");

const { AuthMiddleware, AdminMiddleware } = require('../middlewares/authMiddleware');

router.use(AuthMiddleware);

router.route("/")
  .get(getRooms)
  .post(AdminMiddleware, createRoom);

router.route("/:uuid")
  .get(getRoom)
  .put(AdminMiddleware, editRoom)
  .delete(AdminMiddleware, deleteRoom);

router.route("/facility/:facility_uuid")
  .get(getRoomsByFacility);

module.exports = router;
