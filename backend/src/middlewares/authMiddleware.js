const sessions = require('../utils/sessions')
const { ROLES } = require("../utils/constants");
const User = require('../models/user')

const middlewares = {
  /**
   * Middleware que comprueba la existencia de la sesión en Redis
   */
  AuthMiddleware: async function (req, res, next) {
    const token = req.headers.authorization ? req.headers.authorization.split(" ")[1] : null;
    
    if (!token) {
      return res.status(401).json({ ok: false, message: 'No token provided' });
    }

    const stored = await sessions.get(token)

    // Sin Redis no se puede validar: 503 para que el cliente reintente y no dé la sesión por cerrada
    if (stored?.error) return res.status(503).json({ ok: false, message: 'Servicio no disponible temporalmente' })

    if (stored) {
      // Rol, empresa y estado salen de la BD en cada petición: la sesión solo identifica al usuario
      const user = await User.refreshSession(JSON.parse(stored))
      if (!user) {
        await sessions.destroy(token)
        return res.status(401).json({ ok: false, message: 'Usuario deshabilitado' })
      }
      res.locals.user = user
      res.locals.token = token
      return next();
    }

    res.status(401).json({ ok: false, message: 'Not valid token' });
  },
  /**
   * Middleware que comprueba si el usuario es administrador
   * Debe usarse después de AuthMiddleware
   */
  AdminMiddleware: async function (req, res, next) {
    if (res.locals.user && res.locals.user.role === ROLES.ADMIN) {
      return next();
    }
    res.status(403).json({ ok: false, message: 'Sorry but you are not authorized as admin' });
  },

  GestorMiddleware: async function (req, res, next) {
    if (res.locals.user && (res.locals.user.role === ROLES.GESTOR || res.locals.user.role === ROLES.ADMIN)) {
      return next();
    }
    res.status(403).json({ ok: false, message: 'Sorry but you are not authorized as gestor or admin' });
  },

  UserEditMiddleware: async function (req, res, next) {
    if (res.locals.user && (res.locals.user.role === ROLES.ADMIN || res.locals.user.uuid === req.params.uuid)) {
      return next();
    }
    res.status(403).json({ ok: false, message: 'Sorry but you are not authorized as gestor or admin or as the user requested' });
  },
};
module.exports = middlewares;
