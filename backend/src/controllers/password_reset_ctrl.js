const User = require('../models/user')
const sessions = require('../utils/sessions')

// Recuperación de contraseña: solo con el token del correo, nunca con una sesión
const passwordResetCtrl = {}

const INVALID_LINK = 'El enlace no es válido o ha caducado. Solicita uno nuevo'

passwordResetCtrl.requestPasswordReset = async (req, res) => {
  const { email } = req.body
  if (typeof email !== 'string' || !email) return res.status(400).json({ ok: false, message: 'El correo es requerido' })

  await new User().sendPasswordResetEmail(email)
  return res.json({ ok: true, message: 'Si el correo existe, recibirás un enlace de recuperación en esa dirección' })
}

passwordResetCtrl.checkResetToken = async (req, res) => {
  const uuid = await User.findByResetToken(req.body.token)
  if (!uuid) return res.status(400).json({ ok: false, message: INVALID_LINK })
  return res.json({ ok: true })
}

passwordResetCtrl.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body
  if (typeof newPassword !== 'string' || newPassword.length < 8) return res.status(400).json({ ok: false, message: 'La contraseña debe tener al menos 8 caracteres' })

  const uuid = await User.findByResetToken(token)
  if (!uuid) return res.status(400).json({ ok: false, message: INVALID_LINK })

  const user = new User(uuid)
  if (await user.isActive() !== true) {
    await user.consumeResetToken(token)
    return res.status(400).json({ ok: false, message: INVALID_LINK })
  }

  const result = await user.update({ password: newPassword })
  if (result.error || result.affectedRows === 0) return res.status(500).json({ ok: false, message: 'Error al actualizar la contraseña' })

  await user.consumeResetToken(token)
  await sessions.destroyAll(uuid)
  return res.json({ ok: true, message: 'Contraseña actualizada correctamente' })
}

module.exports = passwordResetCtrl
