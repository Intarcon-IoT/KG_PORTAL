// Odoo 19 por JSON-2 (POST /json/2/<modelo>/<método>, API key en bearer). Lanza ante cualquier error
// con `odooStatus` y el mensaje de Odoo; las lecturas se reintentan ante fallos de red o 502/503/504
const TIMEOUT_MS = Number(process.env.ODOO_TIMEOUT_MS) || 30000
const READS = new Set(['search_read', 'read', 'search', 'search_count', 'fields_get', 'name_search', 'read_group', 'web_search_read', 'default_get', 'context_get'])
const RETRY_STATUS = [502, 503, 504]
const RETRIES = 3

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

const odoo = {}

odoo.configured = () => !!(process.env.ODOO_HOST && process.env.ODOO_DB && process.env.ODOO_API_KEY)

// Solo el origen de ODOO_HOST: la URL de la interfaz (…/odoo) también vale y JSON-2 cuelga de la raíz
const origin = () => { try { return new URL(process.env.ODOO_HOST).origin } catch { return '' } }

odoo.url = (path = '') => origin() + path

odoo.call = async (model, method, body = {}) => {
  if (!odoo.configured()) throw Object.assign(new Error('Odoo no está configurado (ODOO_HOST, ODOO_DB, ODOO_API_KEY)'), { odooStatus: 503 })
  const isRead = READS.has(method)
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(odoo.url(`/json/2/${model}/${method}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `bearer ${process.env.ODOO_API_KEY}`, 'X-Odoo-Database': process.env.ODOO_DB },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      const data = await res.json().catch(() => null)
      if (res.ok) return data
      if (isRead && RETRY_STATUS.includes(res.status) && attempt < RETRIES) { await wait(250 * 4 ** (attempt - 1)); continue }
      throw Object.assign(new Error(data?.message || `Odoo HTTP ${res.status}`), { odooStatus: res.status, odoo: data })
    } catch (error) {
      if (error.odooStatus) throw error
      // Sin respuesta: una escritura no se repite porque podría haber llegado a Odoo
      if (isRead && attempt < RETRIES) { await wait(250 * 4 ** (attempt - 1)); continue }
      const reason = error.name === 'TimeoutError' ? 'tiempo agotado' : error.cause?.code || error.cause?.errors?.[0]?.code || error.message
      throw Object.assign(new Error(`Odoo sin respuesta: ${reason}`), { odooStatus: 504 })
    }
  }
}

module.exports = odoo
