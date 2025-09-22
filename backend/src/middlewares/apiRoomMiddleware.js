const LegacyRoom = require("../models/Legacy/legacyRoom");

const middlewares = {
  /**
   * Middleware que comprueba que el token sea para una sala válida
   */
  ApiRoomMiddleware: async function (req, res, next) {
    const token = req.headers.authorization ?? null;

    const room = new LegacyRoom(req.params.uuid);
    const valid = await room.checkToken(token);

    if (valid) {
      next();
    } else {
      res.status(403).json({ ok: false, message: 'Sorry but you are not authorized' });
    }
  }
};

module.exports = middlewares;
