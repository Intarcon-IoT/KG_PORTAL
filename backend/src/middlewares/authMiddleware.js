const cache = require('../utils/cacheAdapter');

const middlewares = {
  /**
   * Middleware que comprueba la existencia de la sesión en Redis
   */
  AuthMiddleware: async function (req, res, next) {
    const token = req.headers.authorization ? req.headers.authorization.split(" ")[1] : null;
    const exist = await cache.getRedis(token, true);

    if (exist) {
      res.locals.user = JSON.parse(exist);

      next();
    } else {
      res.status(403).json({ ok: false, message: 'Sorry but you are not authorized' });
    }
  },
  /**
   * Middleware que comprueba si el usuario es administrador
   * Debe usarse después de AuthMiddleware
   */
  AdminMiddleware: async function (req, res, next) {
    if (res.locals.user && res.locals.user.isAdmin) {
      return next();
    }
    res.status(403).json({ ok: false, message: 'Sorry but you are not authorized as admin' });
  }
};
module.exports = middlewares;
