const { Router } = require('express')
const router = Router()

const { getRoles, createRole, updateRole, deleteRole } = require('../controllers/role_ctrl')
const { AuthMiddleware, AdminMiddleware, can } = require('../middlewares/authMiddleware')

router.use(AuthMiddleware)

// Leer los roles le basta a quien ve usuarios (desplegable y pestañas); gestionarlos, solo el Admin
router.route('/')
  .get(can('users.view'), getRoles) //ROLES CON SUS PERMISOS Y Nº DE USUARIOS
  .post(AdminMiddleware, createRole) //ROL NUEVO

router.route('/:uuid')
  .put(AdminMiddleware, updateRole) //NOMBRE, DESCRIPCIÓN Y PERMISOS POR DEFECTO
  .delete(AdminMiddleware, deleteRole) //SOLO ROLES PROPIOS SIN USUARIOS

module.exports = router
