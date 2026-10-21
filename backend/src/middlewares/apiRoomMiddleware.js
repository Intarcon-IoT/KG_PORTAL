const LegacyRoom = require("../models/Legacy/legacyRoom");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const middlewares = {
  // Pantallas de sala: el api_token de la sala va tal cual en Authorization
  ApiRoomMiddleware: async function (req, res, next) {
    if (!UUID.test(req.params.uuid)) return res.status(404).json({ ok: false, message: 'Sala no encontrada' })
    const valid = await new LegacyRoom(req.params.uuid).checkToken(req.headers.authorization)
    if (valid) return next()
    res.status(403).json({ ok: false, message: 'Sorry but you are not authorized' })
  }
};

module.exports = middlewares;
