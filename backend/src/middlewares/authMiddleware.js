const cache = require('../utils/cacheAdapter');
const thirdPartyConfig = require('../../configThirdParty.json');
const { ROLES } = require("../utils/constants");

const middlewares = {
  /**
   * Middleware que comprueba la existencia de la sesión en Redis
   */
  AuthMiddleware: async function (req, res, next) {
    const token = req.headers.authorization ? req.headers.authorization.split(" ")[1] : null;
    
    if (!token) {
      return res.status(401).json({ ok: false, message: 'No token provided' });
    }

    const exist = await cache.getRedis(token, true);

    if (exist && !exist.error) {
      res.locals.user = typeof exist === 'string' ? JSON.parse(exist) : exist;
      return next();
    }

    const thirdParty = Object.values(thirdPartyConfig).find(tp => tp.api_token === token);
    
    if (thirdParty) {
      res.locals.user = {
        uuid: thirdParty.uuid,
        isAdmin: false
      };
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
  }
};
module.exports = middlewares;
