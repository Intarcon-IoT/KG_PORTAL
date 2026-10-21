const cache = require('./cacheAdapter')
const { createCacheToken, hashToken } = require('./userToken')

// Sesiones en Redis bajo el hash del token; sessions.<uuid> indexa las de cada usuario para cerrarlas todas
const sessions = {}
const TIME_ZONE = 'Europe/Madrid'

// Minutos que la zona va por delante de UTC en un instante dado (cambia con el horario de verano)
const zoneOffset = date => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(date).map(p => [p.type, Number(p.value)]))
  return (Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - date.getTime()) / 60000
}

// Las sesiones caducan el domingo de su semana a las 23:59:59 (hora de Madrid), sea cual sea la zona del servidor
sessions.endOfWeek = (now = new Date()) => {
  const local = new Date(now.getTime() + zoneOffset(now) * 60000)
  const daysToSunday = (7 - local.getUTCDay()) % 7
  const wall = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + daysToSunday, 23, 59, 59)
  const guess = new Date(wall - zoneOffset(new Date(wall)) * 60000)
  return new Date(wall - zoneOffset(guess) * 60000)
}

const secondsLeft = () => Math.max(1, Math.floor((sessions.endOfWeek().getTime() - Date.now()) / 1000))

sessions.create = async user => {
  const token = createCacheToken()
  const hash = hashToken(token)
  const ttl = secondsLeft()
  const saved = await cache.setRedis(hash, user, true, ttl)
  if (saved?.error) return null
  await cache.addToSet(`sessions.${user.uuid}`, hash, ttl)
  return token
}

// Devuelve el JSON tal como está en Redis (texto), null si no existe o { error } si Redis no responde
sessions.get = async token => {
  if (typeof token !== 'string' || !token) return null
  const stored = await cache.getRedis(hashToken(token), true)
  if (stored?.error) return stored
  return typeof stored === 'string' ? stored : null
}

sessions.destroy = async token => {
  const stored = await sessions.get(token)
  await cache.delRedis(hashToken(token), true)
  if (typeof stored === 'string') await cache.removeFromSet(`sessions.${JSON.parse(stored).uuid}`, hashToken(token))
}

// Cierra todas las sesiones de un usuario (cambio de contraseña, rol o empresa, o deshabilitado)
sessions.destroyAll = async uuid => {
  const hashes = await cache.getSet(`sessions.${uuid}`)
  if (Array.isArray(hashes)) for (const hash of hashes) await cache.delRedis(hash, true)
  await cache.delRedis(`sessions.${uuid}`)
}

module.exports = sessions
