const { Router } = require("express");
const router = Router();

const {
  signIn, logOut, loadSession,
  getUsers, getUser, getDeletionImpact,
  createUser, deleteUser, updateUser
} = require("../controllers/user_ctrl");

const { AuthMiddleware, AdminMiddleware, GestorMiddleware } = require('../middlewares/authMiddleware');

router.route('/sign-in')
  .post(signIn);

router.route('/load-session')
  .post(loadSession);

router.route('/log-out')
  .post(AuthMiddleware, logOut);

router.route("/")
  .get(AuthMiddleware, GestorMiddleware, getUsers)
  .post(AuthMiddleware, GestorMiddleware, createUser);

router.route("/:uuid")
  .get(AuthMiddleware, getUser)
  .delete(AuthMiddleware, GestorMiddleware, deleteUser)
  .put(AuthMiddleware, GestorMiddleware, updateUser);

router.route("/:uuid/deletion-impact")
  .get(AuthMiddleware, GestorMiddleware, getDeletionImpact);

module.exports = router;
