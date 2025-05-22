const { Router } = require("express");
const router = Router();

const {
  getFacilities, getFacility,
  createFacility, editFacility, deleteFacility
} = require("../controllers/facility_ctrl");

const { AuthMiddleware } = require('../middlewares/authMiddleware');

router.use(AuthMiddleware);

router.route("/")
  .get(getFacilities)
  .post(createFacility);

router.route("/:uuid")
  .get(getFacility)
  .put(editFacility)
  .delete(deleteFacility);

module.exports = router;
