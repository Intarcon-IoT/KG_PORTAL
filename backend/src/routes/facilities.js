const { Router } = require("express");
const router = Router();

const {
  getFacilities, getFacility,
  createFacility, editFacility, deleteFacility
} = require("../controllers/facility_ctrl");

const { AuthMiddleware, AdminMiddleware } = require('../middlewares/authMiddleware');

router.use(AuthMiddleware);

router.route("/")
  .get(getFacilities)
  .post(AdminMiddleware, createFacility);

router.route("/:uuid")
  .get(getFacility)
  .put(AdminMiddleware, editFacility)
  .delete(AdminMiddleware, deleteFacility);

module.exports = router;
