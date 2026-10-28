const { Router } = require("express");
const router = Router();

const {
  getRooms, getRoom, getRoomsByFacility,
  createRoom, editRoom, deleteRoom
} = require("../controllers/room_ctrl");

const { AuthMiddleware, can } = require('../middlewares/authMiddleware');

router.use(AuthMiddleware);

router.route("/")
  .get(getRooms)
  .post(can('rooms.manage'), createRoom);

router.route("/:uuid")
  .get(getRoom)
  .put(can('rooms.manage'), editRoom)
  .delete(can('rooms.manage'), deleteRoom);

router.route("/facility/:facility_uuid")
  .get(getRoomsByFacility);

module.exports = router;
