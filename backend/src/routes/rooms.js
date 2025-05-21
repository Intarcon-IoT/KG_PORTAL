const { Router } = require("express");
const router = Router();

const {
  getRooms, getRoom, getRoomsByFacility,
  createRoom, editRoom, deleteRoom
} = require("../controllers/room_ctrl");

router.route("/")
  .get(getRooms)
  .post(createRoom);

router.route("/:uuid")
  .get(getRoom)
  .put(editRoom)
  .delete(deleteRoom);

router.route("/facility/:facility_uuid")
  .get(getRoomsByFacility);

module.exports = router;
