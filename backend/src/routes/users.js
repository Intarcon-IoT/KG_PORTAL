const { Router } = require("express");
const router = Router();

const {
  signIn, loadSession,
  getUsers, getUser,
  createUser, editUser, deleteUser
} = require("../controllers/user_ctrl");

router.route('/sign-in')
  .post(signIn);

router.route('/load-session')
  .post(loadSession);

// router.route('/log-out')
//   .post(logOut);

router.route("/")
  .get(getUsers)
  .post(createUser);

router.route("/:uuid")
  .get(getUser)
// .put(editUser)
// .delete(deleteUser);

module.exports = router;
