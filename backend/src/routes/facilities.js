const { Router } = require("express");
const router = Router();

const {
  getFacilities, getFacility,
  createFacility, editFacility, deleteFacility
} = require("../controllers/facility_ctrl");

const { AuthMiddleware, can } = require('../middlewares/authMiddleware');

router.use(AuthMiddleware);

router.route("/")
  .get(getFacilities)
  .post(can('rooms.manage'), createFacility);

router.route("/:uuid")
  .get(getFacility)
  .put(can('rooms.manage'), editFacility)
  .delete(can('rooms.manage'), deleteFacility);

module.exports = router;
