const User = require('../models/user');

const passwordResetCtrl = {};

passwordResetCtrl.requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  const user = new User();

  if (!email) {
    return res.status(400).json({ ok: false, message: "El correo es requerido" });
  }

  await user.sendPasswordResetEmail(email);

  return res.json({ 
    ok: true, 
    message: "Si el correo existe, recibiras un correo de recuperacion a esta dirección" 
  });
};

passwordResetCtrl.resetPassword = async (req, res) => {
  const { newPassword } = req.body;
  const token = req.headers.authorization.split(" ")[1];
  const user = new User(res.locals.user.uuid);

  if (!newPassword) {
    return res.status(400).json({ ok: false, message: "Nueva contraseña es requerida" });
  }

  const result = await user.update({ password: newPassword });

  user.closeSession(token);

  if (result.error) {
    return res.status(500).json({ ok: false, message: "Error al actualizar la contraseña" });
  } else {
    return res.json({ ok: true, message: "Contraseña actualizada correctamente" });
  }
};

module.exports = passwordResetCtrl;
