const { Router } = require("express");
const router = Router();

const {
  signIn, logOut, loadSession,
  getUsers, getUser,
  createUser
} = require("../controllers/user_ctrl");

const { AuthMiddleware } = require('../middlewares/authMiddleware');

router.route('/sign-in')
  .post(signIn);

router.route('/load-session')
  .post(loadSession);

router.route('/log-out')
  .post(AuthMiddleware, logOut);

router.route("/")
  .get(AuthMiddleware, getUsers)
  .post(AuthMiddleware, createUser);

router.route("/:uuid")
  .get(AuthMiddleware, getUser)

module.exports = router;
