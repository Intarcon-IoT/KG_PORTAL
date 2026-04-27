const { Router } = require("express");
const router = Router();

const {
  getTenants
} = require("../controllers/tenant_ctrl");

const { AuthMiddleware } = require('../middlewares/authMiddleware');

router.use(AuthMiddleware);

router.route("/")
  .get(getTenants);

module.exports = router;
