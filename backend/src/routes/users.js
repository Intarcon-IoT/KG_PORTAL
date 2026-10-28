const { Router } = require("express");
const router = Router();

const {
  signIn, logOut, loadSession,
  getUsers, getUser, setUserStatus,
  createUser, updateUser,
  getPermissionCatalog, getUserPermissions, setUserPermissions
} = require("../controllers/user_ctrl");

const { AuthMiddleware, AdminMiddleware, can } = require('../middlewares/authMiddleware');

router.route('/sign-in')
  .post(signIn);

router.route('/load-session')
  .post(loadSession);

router.route('/log-out')
  .post(AuthMiddleware, logOut);

// Alcance por empresa y quién puede tocar a quién: en user_ctrl (canManage)
router.route("/")
  .get(AuthMiddleware, can('users.view'), getUsers)
  .post(AuthMiddleware, can('users.manage'), createUser);

router.get('/permissions', AuthMiddleware, can('users.view'), getPermissionCatalog) //CATÁLOGO DE MÓDULOS Y PERMISOS

router.route("/:uuid")
  .get(AuthMiddleware, getUser) //UNO MISMO O QUIEN VE USUARIOS
  .put(AuthMiddleware, updateUser); //UNO MISMO O QUIEN LO GESTIONA

router.put('/:uuid/status', AuthMiddleware, can('users.manage'), setUserStatus) //HABILITAR / DESHABILITAR
router.route('/:uuid/permissions')
  .get(AuthMiddleware, AdminMiddleware, getUserPermissions) //PERMISOS DEL USUARIO
  .put(AuthMiddleware, AdminMiddleware, setUserPermissions) //SUSTITUIR PERMISOS

module.exports = router;
