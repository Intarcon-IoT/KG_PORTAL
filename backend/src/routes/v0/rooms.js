const { Router } = require("express");
const router = Router();

const {
  getCurrentInfoRoom
} = require("../../controllers/room_ctrl");

const { ApiRoomMiddleware } = require('../../middlewares/apiRoomMiddleware');

router.route("/:uuid")
  .get(ApiRoomMiddleware, getCurrentInfoRoom);

module.exports = router;
