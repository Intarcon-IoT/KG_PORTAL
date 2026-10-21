const { randomBytes, createHash } = require('crypto')

// Tokens de sesión y de recuperación: 256 bits de un generador criptográfico
exports.createCacheToken = () => randomBytes(32).toString('base64url')

// En Redis se guarda el hash: quien lea Redis no obtiene tokens válidos
exports.hashToken = token => createHash('sha256').update(String(token)).digest('base64url')
