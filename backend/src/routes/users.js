const { Router } = require("express");
const router = Router();

const {
  signIn, logOut, loadSession,
  getUsers, getUser, setUserStatus,
  createUser, updateUser
} = require("../controllers/user_ctrl");

const { AuthMiddleware, AdminMiddleware, UserEditMiddleware } = require('../middlewares/authMiddleware');

router.route('/sign-in')
  .post(signIn);

router.route('/load-session')
  .post(loadSession);

router.route('/log-out')
  .post(AuthMiddleware, logOut);

router.route("/")
  .get(AuthMiddleware, AdminMiddleware, getUsers)
  .post(AuthMiddleware, AdminMiddleware, createUser);

router.route("/:uuid")
  .get(AuthMiddleware, UserEditMiddleware, getUser)
  .put(AuthMiddleware, UserEditMiddleware, updateUser);

router.put('/:uuid/status', AuthMiddleware, AdminMiddleware, setUserStatus) //HABILITAR / DESHABILITAR

module.exports = router;
