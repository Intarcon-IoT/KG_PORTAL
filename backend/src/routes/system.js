const { Router } = require("express");
const router = Router();

const {
  getVersion
} = require("../controllers/system_ctrl");

const { AuthMiddleware } = require('../middlewares/authMiddleware');

router.use(AuthMiddleware);

router.route('/version')
  .get(getVersion);

module.exports = router;
