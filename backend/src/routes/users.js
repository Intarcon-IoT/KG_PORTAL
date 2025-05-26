const { Router } = require("express");
const router = Router();

const {
  signIn, loadSession,
  getUsers, getUser,
  createUser
} = require("../controllers/user_ctrl");

const { AuthMiddleware } = require('../middlewares/authMiddleware');

router.use(AuthMiddleware);

router.route('/sign-in')
  .post(signIn);

router.route('/load-session')
  .post(loadSession);

// router.route('/log-out')
//   .post(logOut);

router.route("/")
  .get(AuthMiddleware, getUsers)
  .post(AuthMiddleware, createUser);

router.route("/:uuid")
  .get(AuthMiddleware, getUser)

module.exports = router;
