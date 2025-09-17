const { Router } = require("express");
const router = Router();

const {
  requestPasswordReset,
  resetPassword
} = require("../controllers/password_reset_ctrl");
const { AuthMiddleware } = require("../middlewares/authMiddleware");

router.route('/request-password-reset')
  .post(requestPasswordReset);

router.route('/reset-password')
  .put(AuthMiddleware, resetPassword);

module.exports = router;
