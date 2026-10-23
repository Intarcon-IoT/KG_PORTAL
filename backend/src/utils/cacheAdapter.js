const cacheAdapter = {};
const logger = require('./logger').init();

const redis = require('redis');
const SECRET = process.env.SECRET_KEY_CACHE;
const HOST = process.env.REDIS_HOST;
const PORT = process.env.REDIS_PORT;
const USER = process.env.REDIS_USER || undefined
const PASS = process.env.REDIS_PASS || undefined

// Credenciales fuera de la URL: una contraseña con símbolos no rompe el parseo
// Sin reconexión: cada operación abre su cliente y, si Redis no responde, falla en 3 s en vez de quedarse esperando
const config = { url: `redis://${HOST}:${PORT}`, username: USER, password: PASS, socket: { connectTimeout: 3000, reconnectStrategy: false } }

// Abre un cliente, ejecuta la operación y lo cierra siempre; ante error devuelve { error }
const run = async fn => {
  const client = redis.createClient(config).on('error', () => {})
  try {
    await client.connect()
    return await fn(client)
  } catch (error) {
    logger.error('REDIS - ' + (error?.message || error))
    return { error: true, errorInfo: error }
  } finally {
    if (client.isOpen) await client.close().catch(() => {})
  }
}

// token = true usa el separador ":" de las sesiones; el resto, "."
const keyOf = (key, token) => SECRET + (token ? ':' : '.') + key

// Devuelve el valor (texto) o null si no existe
cacheAdapter.getRedis = (key, token = false) => run(client => client.get(keyOf(key, token)))

cacheAdapter.setRedis = (key, value, token = false, expirationTime = 2592000) =>
  run(client => client.set(keyOf(key, token), JSON.stringify(value), expirationTime ? { EX: expirationTime } : {}))

cacheAdapter.delRedis = (key, token = false) => run(async client => { await client.del(keyOf(key, token)); return true })

// Conjuntos (claves con separador "."): índice de sesiones por usuario
cacheAdapter.addToSet = (key, member, expirationTime) => run(async client => {
  await client.sAdd(SECRET + '.' + key, member)
  if (expirationTime) await client.expire(SECRET + '.' + key, expirationTime)
  return true
})

cacheAdapter.getSet = key => run(client => client.sMembers(SECRET + '.' + key))

cacheAdapter.removeFromSet = (key, member) => run(client => client.sRem(SECRET + '.' + key, member))

// 'PONG' si Redis responde; lo usa /ready
cacheAdapter.ping = () => run(client => client.ping())

module.exports = cacheAdapter;
