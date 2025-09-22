const { Router } = require("express");
const router = Router();

const {
  signIn, logOut, loadSession,
  getUsers, getUser, getDeletionImpact,
  createUser, deleteUser, updateUser
} = require("../controllers/user_ctrl");

const { AuthMiddleware, AdminMiddleware } = require('../middlewares/authMiddleware');

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
  .get(AuthMiddleware, getUser)
  .delete(AuthMiddleware, AdminMiddleware, deleteUser)
  .put(AuthMiddleware, updateUser);

router.route("/:uuid/deletion-impact")
  .get(AuthMiddleware, AdminMiddleware, getDeletionImpact);

module.exports = router;
