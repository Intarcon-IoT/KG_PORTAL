// /ready, ruta única de estado con el contrato común (Servidores de INTARCON Tools): si responde, el proceso vive, y
// `checks` da cada servicio. Una vigilancia en segundo plano los comprueba y la ruta pública solo lee su estado
const fs = require('fs')
const path = require('path')
const { pool } = require('../connections/mysql')
const cacheAdapter = require('./cacheAdapter')
const transporter = require('../connections/mailer')
const { getVersion } = require('./version')
const odooAdapter = require('./odooAdapter')

const TIMEOUT_MS = 5000
const MIN = 60000
// Sin ellos el portal no funciona: si caen, /ready responde 503
const CRITICAL = ['MySQL KG Portal', 'Redis', 'SMTP']
const LOGS_DIR = path.join(__dirname, '../../logs')

const states = {}

const withTimeout = (promise, ms) => Promise.race([promise, new Promise((resolve, reject) => setTimeout(() => reject(Object.assign(new Error('TIMEOUT'), { code: 'TIMEOUT' })), ms).unref())])

// Directo al pool: el adaptador registraría un error en cada comprobación mientras la base esté caída
const pingMysql = () => new Promise((resolve, reject) => pool.query('SELECT 1', error => (error ? reject(error) : resolve())))
const pingRedis = async () => { const r = await cacheAdapter.ping(); if (r !== 'PONG') throw r?.errorInfo ?? new Error('REDIS') }

// Comprueba `ping` cada `every` ms; el log solo recoge los cambios de estado (consola: pm2 la guarda, y otro
// logger.init() competiría con los demás al rotar, OPE-07)
const watch = (name, ping, { every = 30000, timeout = TIMEOUT_MS } = {}) => {
  const state = states[name] = { status: 'unknown', since: Date.now(), ms: null }
  const check = async () => {
    const start = Date.now()
    let status = 'ok', error = null
    try { await withTimeout(ping(), timeout) } catch (e) { status = 'down'; error = e?.code || e?.message }
    state.ms = Date.now() - start
    if (state.status === status) return
    if (status === 'down') console.error(`[READY] ${name} no disponible: ${error}`)
    else if (state.status === 'down') console.log(`[READY] ${name} recuperado`)
    Object.assign(state, { status, since: Date.now() })
  }
  check()
  setInterval(check, every).unref()
}

const startMonitoring = () => {
  watch('MySQL KG Portal', pingMysql)
  if (process.env.REDIS_HOST) watch('Redis', pingRedis)
  if (process.env.SMTP_HOST) watch('SMTP', () => transporter.verify(), { every: 5 * MIN, timeout: 10000 })
  watch('Carpeta de logs', () => fs.promises.access(LOGS_DIR, fs.constants.W_OK), { every: 5 * MIN })
  if (odooAdapter.configured()) watch('Odoo', odooAdapter.ping, { every: 5 * MIN, timeout: 15000 })
}

const ready = (req, res) => {
  const checks = {}
  for (const [name, { status, since, ms }] of Object.entries(states)) checks[name] = { status, critical: CRITICAL.includes(name), ms, since: new Date(since).toISOString() }
  const failing = Object.values(checks).filter(c => c.status !== 'ok')
  const status = failing.some(c => c.critical && c.status === 'down') ? 'down' : failing.length ? 'degraded' : 'ok'
  res.status(status === 'down' ? 503 : 200).set('Cache-Control', 'no-store')
    .json({ status, service: 'kg-portal', version: getVersion(), uptime_s: Math.round(process.uptime()), ts: new Date().toISOString(), checks })
}

module.exports = { ready, startMonitoring }
