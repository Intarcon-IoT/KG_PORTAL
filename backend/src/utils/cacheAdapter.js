const cacheAdapter = {};
const logger = require('./logger').init();

const redis = require('redis');
const SECRET = process.env.SECRET_KEY_CACHE;
const HOST = process.env.REDIS_HOST;
const PORT = process.env.REDIS_PORT;
const USER = process.env.REDIS_USER || undefined
const PASS = process.env.REDIS_PASS || undefined

// Credenciales fuera de la URL: una contraseña con símbolos no rompe el parseo
var config = { url: `redis://${HOST}:${PORT}`, username: USER, password: PASS }

/**
 * Método para obtener entradas de Redis
 * @param {*} key Método para obtener entradas de Redis
 * @param {*} token Si se trata de una entrada de token de sesión o no
 * @returns Boolean éxito
 */
cacheAdapter.getRedis = async (key, token = false) => {
  try {
    const separator = token ? ":" : ".";
    const client = redis.createClient(config);
    await client.connect();
    const result = await client.get(SECRET + separator + key);
    await client.close();

    return result;
  } catch (error) {
    logger.error("REDIS - " + JSON.stringify(error, null, 2));
    return { error: true, errorInfo: error };
  }
}

/**
 * Método para crear o actualizar entradas de Redis
 * @param {*} key Clave de la entrada (sin SECRET)
 * @param {*} value Valor que va a tomar la entrada
 * @param {*} token Si se trata de una entrada de token de sesión o no
 * @param {*} expirationTime Tiempo de expiración
 * @returns Boolean éxito
 */
cacheAdapter.setRedis = async (key, value, token = false, expirationTime = 2592000) => {
  let params = {};
  if (expirationTime) {
    params.EX = expirationTime;
  }

  try {
    const separator = token ? ":" : ".";
    const client = redis.createClient(config);
    await client.connect();
    const result = await client.set(SECRET + separator + key, JSON.stringify(value), params);
    await client.close();

    return result;
  } catch (error) {
    logger.error("REDIS - " + JSON.stringify(error, null, 2));
    return { error: true, errorInfo: error };
  }
}

/**
 * Método para borrar entradas de Redis
 * @param {*} key Clave de la entrada (sin SECRET)
 * @param {*} token Si se trata de una entrada de token de sesión o no
 * @returns Boolean éxito
 */
cacheAdapter.delRedis = async (key, token = false) => {
  try {
    const separator = token ? ":" : ".";
    const client = redis.createClient(config);
    await client.connect();
    await client.del(SECRET + separator + key);
    await client.close();

    return true;
  } catch (error) {
    logger.error("REDIS - " + JSON.stringify(error, null, 2));
    return { error: true, errorInfo: error };
  }
}

module.exports = cacheAdapter;
