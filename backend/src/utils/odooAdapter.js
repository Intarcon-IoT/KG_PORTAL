const odoo = require('../connections/odoo')

// Operaciones de Odoo con el contexto del portal (idioma, zona y compañía INTARCON por defecto)
const COMPANY_ID = Number(process.env.ODOO_COMPANY_ID) || 1
const CONTEXT = { lang: 'es_ES', tz: 'Europe/Madrid', allowed_company_ids: [COMPANY_ID] }
const modelIds = {}

const odooAdapter = { COMPANY_ID, configured: odoo.configured, url: odoo.url }

odooAdapter.search = (model, domain = [], fields = [], options = {}) => odoo.call(model, 'search_read', { context: CONTEXT, domain, ...(fields.length ? { fields } : {}), ...options })

odooAdapter.read = async (model, ids, fields) => ids.length ? odoo.call(model, 'read', { ids, fields, context: CONTEXT }) : []

odooAdapter.create = async (model, vals) => {
  const ids = await odoo.call(model, 'create', { vals_list: [vals], context: CONTEXT })
  return { id: ids[0] }
}

// write, acciones de registro, message_notify…: lo que devuelven varía, así que solo se comprueba que no fallen
odooAdapter.call = async (model, method, ids = [], params = {}) => {
  await odoo.call(model, method, { ...(ids.length ? { ids } : {}), ...params, context: CONTEXT })
  return { ok: true }
}

odooAdapter.fieldsGet = (model, fields) => odoo.call(model, 'fields_get', { allfields: fields, attributes: ['selection', 'string'], context: CONTEXT })

// id de ir.model (res_model_id de mail.activity); se resuelve una vez por proceso
odooAdapter.modelId = async model => {
  if (modelIds[model]) return modelIds[model]
  const [found] = await odooAdapter.search('ir.model', [['model', '=', model]], ['id'], { limit: 1 })
  if (!found) throw new Error(`Modelo ${model} no existe en Odoo`)
  return modelIds[model] = found.id
}

// Comprobación de acceso para /ready y la pantalla de Recepción: nombre de la compañía
odooAdapter.ping = async () => {
  const [company] = await odooAdapter.search('res.company', [['id', '=', COMPANY_ID]], ['name'], { limit: 1 })
  if (!company) throw new Error(`La compañía ${COMPANY_ID} no existe en Odoo`)
  return company.name
}

module.exports = odooAdapter
