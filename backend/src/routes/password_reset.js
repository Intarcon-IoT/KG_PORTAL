const { Router } = require("express");
const router = Router();

const { requestPasswordReset, checkResetToken, resetPassword } = require("../controllers/password_reset_ctrl");

// Sin AuthMiddleware: estas rutas solo aceptan el token de recuperación del correo
router.post('/request-password-reset', requestPasswordReset) //SOLICITAR ENLACE
router.post('/check', checkResetToken) //VALIDAR ENLACE
router.put('/reset-password', resetPassword) //CAMBIAR CONTRASEÑA

module.exports = router;
