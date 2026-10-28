// Visitas de recepción sobre Odoo: x_visita (cabecera) y frontdesk.visitor (una ficha por persona). Las reglas de
// Odoo 187/188/195/196 mandan la información previa, la firma y el aviso al anfitrión: crear una visita envía correos
const odoo = require('./odooAdapter')

const STATION_ID = 1                    // frontdesk.frontdesk Recepción
const VISITOR_TAG_ID = 52               // res.partner.category Visitante
const LANGS = ['es', 'en', 'fr']
const ODOO_LANGS = { es: 'es_ES', en: 'en_GB', fr: 'fr_FR' }
const VISIT_FIELDS = ['x_name', 'x_empresa_id', 'x_fecha', 'x_anfitrion_ids', 'x_motivo', 'x_visita_a', 'x_tipo_visita', 'x_visita_fabrica']
const PERSON_FIELDS = ['name', 'email', 'phone', 'company', 'x_empresa_id', 'x_partner_id', 'x_sin_registro', 'x_visita_id', 'x_idioma', 'host_ids', 'check_in', 'check_out', 'state', 'x_sign_request_id', 'x_info_previa_fecha', 'x_tipo_visita', 'x_visita_a', 'x_motivo', 'x_visita_fabrica']
const HOST_FIELDS = ['name', 'job_title', 'department_id', 'work_email', 'work_phone', 'mobile_phone', 'x_hora_fin_l_j', 'x_hora_fin_v']
const SIGNATURE = { signed: 'signed', sent: 'sent', shared: 'sent' }
const CACHE_MS = 10 * 60 * 1000
const MAX_CALENDAR_DAYS = 62
const MAX_PEOPLE = 50

const odooId = value => { const n = Number(value); return Number.isInteger(n) && n > 0 ? n : null }
const cleanText = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const isEmail = value => /^\S+@\S+\.\S+$/.test(value)
const isDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value ?? '')
const unique = list => [...new Set(list)]
const labelOf = (list, key) => list.find(([value]) => value === key)?.[1] ?? null

// Error de datos del navegador (400/404): se responde tal cual, no como fallo de Odoo
const clientError = (status, message) => Object.assign(new Error(message), { clientStatus: status })

// Fechas: Odoo guarda 'YYYY-MM-DD HH:mm:ss' en UTC; lo que llega sin zona es hora de Madrid
const odooDt = d => d.toISOString().slice(0, 19).replace('T', ' ')
const fromOdoo = s => new Date(s.replace(' ', 'T') + 'Z')
const madridOffset = d => new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Madrid' })) - new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }))
const madridDate = s => /[zZ]$|[+-]\d\d:?\d\d$/.test(s) ? new Date(s) : (d => new Date(+d - madridOffset(d)))(new Date(s + 'Z'))
const nextDay = date => new Date(Date.parse(date + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10)
const dayBounds = (from, to = from) => [odooDt(madridDate(`${from}T00:00:00`)), odooDt(madridDate(`${nextDay(to)}T00:00:00`))]
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' })

const langOf = (value, odooLang) => {
  if (LANGS.includes(value)) return value
  if (odooLang?.startsWith('fr')) return 'fr'
  return odooLang && !odooLang.startsWith('es') ? 'en' : 'es'
}

// Historial del chatter en texto plano (el HTML de Odoo no se pinta tal cual)
const htmlText = html => typeof html === 'string'
  ? html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim()
  : ''

// Caché en memoria del proceso para lo que cambia poco (desplegables y anfitriones)
const memo = {}
const cached = async (key, load) => {
  if (memo[key] && memo[key].until > Date.now()) return memo[key].value
  const value = await load()
  memo[key] = { value, until: Date.now() + CACHE_MS }
  return value
}

// Hora de salida del día (campos de Odoo, texto «17:30»): lunes a jueves y viernes; fin de semana no hay
const endTime = e => {
  const day = new Date().toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Europe/Madrid' })
  if (day === 'Fri') return e.x_hora_fin_v || null
  return day === 'Sat' || day === 'Sun' ? null : e.x_hora_fin_l_j || null
}

const visits = {}

// Desplegables de la visita (motivo, visita a, tipo) leídos de Odoo
visits.options = () => cached('options', async () => {
  const fields = await odoo.fieldsGet('x_visita', ['x_motivo', 'x_visita_a', 'x_tipo_visita'])
  return { reasons: fields.x_motivo.selection, visit_to: fields.x_visita_a.selection, types: fields.x_tipo_visita.selection }
})

// Quién puede ser anfitrión: empleados de la compañía con email o teléfono de trabajo
const loadHosts = () => cached('hosts', () => odoo.search('hr.employee', [['company_id', '=', odoo.COMPANY_ID], '|', ['work_email', '!=', false], ['work_phone', '!=', false]], HOST_FIELDS, { order: 'name' }))

visits.hosts = async () => (await loadHosts()).map(e => ({
  id: e.id,
  name: e.name,
  job_title: e.job_title || null,
  department: e.department_id?.[1] ?? null,
  work_phone: e.work_phone || null,
  mobile_phone: e.mobile_phone || null,
  end_time: endTime(e),
}))

const hostNames = async ids => {
  const names = Object.fromEntries((await loadHosts()).filter(h => ids.includes(h.id)).map(h => [h.id, h.name]))
  const missing = ids.filter(id => !names[id])
  for (const e of await odoo.read('hr.employee', missing, ['name'])) names[e.id] = e.name
  return names
}

const readVisit = async id => {
  const [visit] = id ? await odoo.read('x_visita', [id], VISIT_FIELDS) : []
  if (!visit) throw clientError(404, 'Visita no encontrada')
  return visit
}

const readPerson = async id => {
  const [person] = id ? await odoo.read('frontdesk.visitor', [id], PERSON_FIELDS) : []
  if (!person) throw clientError(404, 'Visitante no encontrado')
  return person
}

const personIds = async (visitId, state) => (await odoo.search('frontdesk.visitor', [['x_visita_id', '=', visitId], ['state', '=', state]], ['id'])).map(p => p.id)

// Estado de la visita a partir de sus personas
const statusOf = persons => {
  const alive = persons.filter(p => p.state !== 'canceled')
  if (!alive.length) return persons.length ? 'canceled' : 'planned'
  if (alive.some(p => p.state === 'checked_in')) return 'checked_in'
  return alive.some(p => p.state === 'planned') ? 'planned' : 'checked_out'
}

const formatPerson = (p, signatures) => {
  const signature = signatures.find(s => s.id === p.x_sign_request_id?.[0])
  return {
    id: p.id,
    name: p.name,
    email: p.email || null,
    phone: p.phone || null,
    registered: !p.x_sin_registro,
    contact: p.x_partner_id || null,
    lang: p.x_idioma || 'es',
    state: p.state,
    check_in: p.check_in || null,
    check_out: p.check_out || null,
    info_sent_at: p.x_info_previa_fecha || null,
    signature: SIGNATURE[signature?.state] ?? 'none',
    signed_at: signature?.completion_date || null,
    // No registrados y contactos sin email firman en la tablet con el contacto genérico
    sign_on_tablet: !!p.x_sin_registro || !p.email,
  }
}

// Une cabeceras y personas. Las personas del kiosco sin visita salen como visita suelta (id null)
const compose = async (headers, persons) => {
  const options = await visits.options()
  const signatures = await odoo.read('sign.request', unique(persons.map(p => p.x_sign_request_id?.[0]).filter(Boolean)), ['state', 'completion_date'])
  const names = await hostNames(unique([...headers.flatMap(v => v.x_anfitrion_ids), ...persons.flatMap(p => p.host_ids)]))
  const now = new Date()
  const close = (visit, hostIds, list) => {
    const status = statusOf(list)
    return {
      ...visit,
      hosts: hostIds.map(id => ({ id, name: names[id] ?? null })),
      persons: list.sort((a, b) => a.x_sin_registro - b.x_sin_registro || a.id - b.id).map(p => formatPerson(p, signatures)),
      status,
      no_show: status === 'planned' && !!visit.date && fromOdoo(visit.date) < now,
    }
  }
  const withHeader = headers.map(v => close({
    id: v.id, loose: false, name: v.x_name, company: v.x_empresa_id || null, date: v.x_fecha,
    reason: v.x_motivo || null, reason_label: labelOf(options.reasons, v.x_motivo),
    visit_to: v.x_visita_a || null, type: v.x_tipo_visita || null, factory: !!v.x_visita_fabrica,
  }, v.x_anfitrion_ids, persons.filter(p => p.x_visita_id?.[0] === v.id)))
  const loose = persons.filter(p => !p.x_visita_id).map(p => close({
    id: null, loose: true, name: p.name, company: p.x_empresa_id || (p.company ? [null, p.company] : null), date: p.check_in,
    reason: null, reason_label: p.x_motivo || null, visit_to: p.x_visita_a || null, type: p.x_tipo_visita || null, factory: !!p.x_visita_fabrica,
  }, p.host_ids, [p]))
  return [...withHeader, ...loose].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
}

// visit_to: solo las visitas a esa empresa del grupo; sin él, todas (la recepción es común)
const companyTerm = async visitTo => {
  if (!visitTo) return []
  if (!labelOf((await visits.options()).visit_to, visitTo)) throw clientError(400, 'Empresa visitada no válida')
  return [['x_visita_a', '=', visitTo]]
}

// Visitas del día, las que tienen a alguien dentro y las sueltas del kiosco
visits.list = async ({ date, visitTo }) => {
  const [start, end] = dayBounds(isDate(date) ? date : today())
  const company = await companyTerm(visitTo)
  const inside = await odoo.search('frontdesk.visitor', [['station_id', '=', STATION_ID], ['state', '=', 'checked_in'], ['x_visita_id', '!=', false]], ['x_visita_id'])
  const headers = await odoo.search('x_visita', [...company, '|', '&', ['x_fecha', '>=', start], ['x_fecha', '<', end], ['id', 'in', unique(inside.map(p => p.x_visita_id[0]))]], VISIT_FIELDS, { order: 'x_fecha asc' })
  const persons = await odoo.search('frontdesk.visitor', [
    '|', ['x_visita_id', 'in', headers.map(v => v.id)],
    ...company.map(() => '&'), '&', '&', ...company, ['station_id', '=', STATION_ID], ['x_visita_id', '=', false],
    '|', ['state', '=', 'checked_in'], '&', '&', ['state', '!=', 'canceled'], ['check_in', '>=', start], ['check_in', '<', end],
  ], PERSON_FIELDS)
  return compose(headers, persons)
}

// Pasadas y futuras, incluidas canceladas, de un rango de 62 días como máximo
visits.calendar = async ({ from, to, visitTo }) => {
  if (!isDate(from) || !isDate(to) || to < from) throw clientError(400, 'Rango de fechas no válido')
  if ((Date.parse(to) - Date.parse(from)) / 86400000 > MAX_CALENDAR_DAYS) throw clientError(400, 'Rango máximo: 62 días')
  const [start, end] = dayBounds(from, to)
  const company = await companyTerm(visitTo)
  const headers = await odoo.search('x_visita', [...company, ['x_fecha', '>=', start], ['x_fecha', '<', end]], VISIT_FIELDS, { order: 'x_fecha asc' })
  const persons = await odoo.search('frontdesk.visitor', [
    '|', ['x_visita_id', 'in', headers.map(v => v.id)],
    ...company.map(() => '&'), '&', '&', '&', ...company, ['station_id', '=', STATION_ID], ['x_visita_id', '=', false], ['check_in', '>=', start], ['check_in', '<', end],
  ], PERSON_FIELDS)
  return compose(headers, persons)
}

// Ficha completa: cabecera, personas con su firma e historial de la visita y de cada persona
visits.detail = async id => {
  const [visit] = odooId(id) ? await odoo.read('x_visita', [odooId(id)], [...VISIT_FIELDS, 'create_date', 'create_uid']) : []
  if (!visit) throw clientError(404, 'Visita no encontrada')
  const persons = await odoo.search('frontdesk.visitor', [['x_visita_id', '=', visit.id]], PERSON_FIELDS)
  const [composed] = await compose([visit], persons)
  const messages = await odoo.search('mail.message', ['|', '&', ['model', '=', 'x_visita'], ['res_id', '=', visit.id], '&', ['model', '=', 'frontdesk.visitor'], ['res_id', 'in', persons.map(p => p.id)]], ['date', 'model', 'res_id', 'subject', 'body', 'subtype_id', 'author_id'], { order: 'date asc' })
  return {
    ...composed,
    created_at: visit.create_date,
    created_by: visit.create_uid?.[1] ?? null,
    history: messages.map(m => ({
      id: m.id,
      date: m.date,
      text: htmlText(m.body) || m.subject || m.subtype_id?.[1] || '',
      author: m.author_id?.[1] ?? null,
      person: m.model === 'frontdesk.visitor' ? persons.find(p => p.id === m.res_id)?.name ?? null : null,
    })).filter(m => m.text),
    odoo_url: odoo.url(`/odoo/x_visita/${visit.id}`),
  }
}

const allowedHostIds = async list => {
  const hostIds = Array.isArray(list) ? unique(list.map(odooId).filter(Boolean)) : []
  if (!hostIds.length) throw clientError(400, 'Indica al menos un anfitrión')
  const allowed = (await loadHosts()).map(h => h.id)
  if (hostIds.some(id => !allowed.includes(id))) throw clientError(400, 'Anfitrión no válido: tiene que ser un empleado con email o teléfono de trabajo')
  return hostIds
}

// Cabecera validada para x_visita
const validateHeader = async body => {
  const options = await visits.options()
  const hostIds = await allowedHostIds(body.host_ids)
  if (!labelOf(options.reasons, body.reason)) throw clientError(400, 'Elige el motivo de la visita')
  if (body.visit_to && !labelOf(options.visit_to, body.visit_to)) throw clientError(400, 'Empresa visitada no válida')
  if (body.type && !labelOf(options.types, body.type)) throw clientError(400, 'Tipo de visita no válido')
  const now = !body.arrival || body.arrival === 'now'
  const date = now ? new Date() : madridDate(String(body.arrival))
  if (isNaN(date)) throw clientError(400, 'Fecha de llegada no válida')
  return {
    now,
    reasonLabel: labelOf(options.reasons, body.reason),
    vals: {
      x_empresa_id: odooId(body.company_id) || false,
      x_fecha: odooDt(date),
      x_anfitrion_ids: [[6, 0, hostIds]],
      x_motivo: body.reason,
      x_visita_a: body.visit_to || false,
      x_tipo_visita: body.type || false,
      x_visita_fabrica: !!body.factory,
    },
  }
}

// Datos de cabecera que lleva cada persona al crearse (la regla 195 los mantiene al día después)
const sharedPersonVals = (header, companyName, reasonLabel) => ({
  station_id: STATION_ID,
  company_id: odoo.COMPANY_ID,
  state: 'planned',
  check_in: header.x_fecha,
  host_ids: header.x_anfitrion_ids,
  x_empresa_id: header.x_empresa_id || false,
  company: companyName || false,
  x_motivo: reasonLabel || false,
  x_visita_a: header.x_visita_a || false,
  x_tipo_visita: header.x_tipo_visita || false,
  x_visita_fabrica: !!header.x_visita_fabrica,
})

// Comandos One2many: visitantes (contactos de Odoo) y no registrados (nombre a mano)
const personLines = async (shared, visitors = [], unregistered = []) => {
  if (!Array.isArray(visitors) || !Array.isArray(unregistered)) throw clientError(400, 'Visitantes no válidos')
  if (visitors.length + unregistered.length > MAX_PEOPLE) throw clientError(400, 'Demasiados visitantes en una sola visita')
  if (visitors.some(v => !odooId(v?.partner_id))) throw clientError(400, 'Cada visitante necesita un contacto de Odoo')
  if (unregistered.some(n => !cleanText(n?.name, 120))) throw clientError(400, 'Cada visitante no registrado necesita nombre')
  if (unregistered.some(n => cleanText(n.email, 120) && !isEmail(cleanText(n.email, 120)))) throw clientError(400, 'Email no válido')

  const ids = unique(visitors.map(v => odooId(v.partner_id)))
  const partners = await odoo.read('res.partner', ids, ['name', 'email', 'phone', 'lang'])
  if (partners.length !== ids.length) throw clientError(404, 'Algún contacto de los visitantes no existe en Odoo')
  const visitorLine = id => {
    const partner = partners.find(p => p.id === id)
    const requested = visitors.find(v => odooId(v.partner_id) === id)
    return [0, 0, { ...shared, x_partner_id: id, name: partner.name, email: partner.email || false, phone: partner.phone || false, x_idioma: langOf(requested.lang, partner.lang), x_sin_registro: false }]
  }
  const unregisteredLine = n => [0, 0, { ...shared, name: cleanText(n.name, 120), email: cleanText(n.email, 120) || false, phone: cleanText(n.phone, 40) || false, x_idioma: langOf(n.lang), x_sin_registro: true }]
  const vals = {}
  if (ids.length) vals.x_visitante_ids = ids.map(visitorLine)
  if (unregistered.length) vals.x_no_registrado_ids = unregistered.map(unregisteredLine)
  return vals
}

// Partners que reciben el aviso: usuario o contacto de trabajo de cada anfitrión
const hostPartners = async hostIds => {
  const employees = await odoo.read('hr.employee', hostIds, ['user_id', 'work_contact_id'])
  const users = await odoo.read('res.users', employees.map(e => e.user_id?.[0]).filter(Boolean), ['partner_id'])
  const ids = unique([...users.map(u => u.partner_id[0]), ...employees.map(e => e.work_contact_id?.[0]).filter(Boolean)])
  if (!ids.length) throw clientError(400, 'Los anfitriones no tienen usuario ni contacto de trabajo en Odoo')
  return ids
}

// Una sola create de x_visita con sus personas. «Ya están aquí»: después, la entrada de cada una
visits.create = async body => {
  const visitors = body.visitors ?? []
  const unregistered = body.unregistered ?? []
  if (!visitors.length && !unregistered.length) throw clientError(400, 'Añade al menos un visitante')
  const header = await validateHeader(body)
  const [company] = await odoo.read('res.partner', header.vals.x_empresa_id ? [header.vals.x_empresa_id] : [], ['name'])
  const lines = await personLines(sharedPersonVals(header.vals, company?.name, header.reasonLabel), visitors, unregistered)
  const result = await odoo.create('x_visita', { ...header.vals, ...lines })
  if (header.now) await eachPerson('action_check_in', await personIds(result.id, 'planned'))
  return { ...result, people: visitors.length + unregistered.length }
}

// Cambiar la cabecera; la regla 195 lo copia a las personas planificadas
visits.update = async (id, body) => {
  const visit = await readVisit(odooId(id))
  const options = await visits.options()
  const vals = {}
  if ('company_id' in body) vals.x_empresa_id = odooId(body.company_id) || false
  if (body.arrival) {
    const date = madridDate(String(body.arrival))
    if (isNaN(date)) throw clientError(400, 'Fecha de llegada no válida')
    vals.x_fecha = odooDt(date)
  }
  if (Array.isArray(body.host_ids) && body.host_ids.length) vals.x_anfitrion_ids = [[6, 0, await allowedHostIds(body.host_ids)]]
  if (labelOf(options.reasons, body.reason)) vals.x_motivo = body.reason
  if (labelOf(options.visit_to, body.visit_to)) vals.x_visita_a = body.visit_to
  if (labelOf(options.types, body.type)) vals.x_tipo_visita = body.type
  if ('factory' in body) vals.x_visita_fabrica = !!body.factory
  if (!Object.keys(vals).length) throw clientError(400, 'Nada que actualizar')
  await odoo.call('x_visita', 'write', [visit.id], { vals })
  return { id: visit.id }
}

// Añadir personas a una visita ya creada; la regla 195 les manda la info previa
visits.addVisitors = async (id, body) => {
  const visit = await readVisit(odooId(id))
  const options = await visits.options()
  const header = { x_fecha: visit.x_fecha, x_anfitrion_ids: [[6, 0, visit.x_anfitrion_ids]], x_empresa_id: visit.x_empresa_id?.[0], x_visita_a: visit.x_visita_a, x_tipo_visita: visit.x_tipo_visita, x_visita_fabrica: visit.x_visita_fabrica }
  const vals = await personLines(sharedPersonVals(header, visit.x_empresa_id?.[1], labelOf(options.reasons, visit.x_motivo)), body.visitors ?? [], body.unregistered ?? [])
  if (!Object.keys(vals).length) throw clientError(400, 'Añade al menos un visitante')
  await odoo.call('x_visita', 'write', [visit.id], { vals })
  return { id: visit.id }
}

// Las acciones de frontdesk.visitor solo admiten un registro por llamada («Expected singleton»)
const eachPerson = async (method, ids) => { for (const id of ids) await odoo.call('frontdesk.visitor', method, [id]) }

// Entrada, salida o cancelación de todas las personas de la visita que están en el estado que toca
const VISIT_ACTIONS = {
  'check-in': { state: 'planned', method: 'action_check_in', empty: 'No queda nadie pendiente de entrada' },
  'check-out': { state: 'checked_in', method: 'action_check_out', empty: 'No queda nadie dentro' },
  cancel: { state: 'planned', method: 'action_canceled', empty: 'No queda nadie por llegar' },
}
visits.visitAction = async (id, action) => {
  const visitId = odooId(id)
  if (!visitId) throw clientError(400, 'Visita no válida')
  const { state, method, empty } = VISIT_ACTIONS[action]
  const ids = await personIds(visitId, state)
  if (!ids.length) throw clientError(400, empty)
  await eachPerson(method, ids)
  return { id: visitId, ids }
}

// Repetir el aviso a los anfitriones, en el historial de la visita
visits.notify = async (id, message) => {
  const visit = await readVisit(odooId(id))
  await odoo.call('x_visita', 'message_notify', [visit.id], {
    partner_ids: await hostPartners(visit.x_anfitrion_ids),
    subject: `Visita en recepción: ${visit.x_name}`,
    body: cleanText(message, 500) || `${visit.x_name}: te están esperando en recepción.`,
  })
  return { id: visit.id }
}

const PERSON_ACTIONS = { 'check-in': 'action_check_in', 'check-out': 'action_check_out', cancel: 'action_canceled' }
visits.personAction = async (id, action) => {
  const person = await readPerson(odooId(id))
  await odoo.call('frontdesk.visitor', PERSON_ACTIONS[action], [person.id])
  return { id: person.id }
}

// Aviso para una visita suelta del kiosco (sin cabecera)
visits.personNotify = async (id, message) => {
  const person = await readPerson(odooId(id))
  const who = person.name + (person.company ? ` (${person.company})` : '')
  await odoo.call('frontdesk.visitor', 'message_notify', [person.id], {
    partner_ids: await hostPartners(person.host_ids),
    subject: `Visita en recepción: ${who}`,
    body: cleanText(message, 500) || `${who} te está esperando en recepción.`,
  })
  return { id: person.id }
}

// Completar nombre, email o teléfono. Con visita se escribe a través de ella: la regla 195 manda la info previa si hay tiempo
visits.completePerson = async (id, body) => {
  const vals = {}
  for (const key of ['name', 'email', 'phone']) if (cleanText(body[key], 120)) vals[key] = cleanText(body[key], 120)
  if (!Object.keys(vals).length) throw clientError(400, 'Nada que actualizar')
  if (vals.email && !isEmail(vals.email)) throw clientError(400, 'Email no válido')
  const person = await readPerson(odooId(id))
  if (person.x_visita_id) await odoo.call('x_visita', 'write', [person.x_visita_id[0]], { vals: { [person.x_sin_registro ? 'x_no_registrado_ids' : 'x_visitante_ids']: [[1, person.id, vals]] } })
  else await odoo.call('frontdesk.visitor', 'write', [person.id], { vals })
  return { id: person.id }
}

// Enlace público para firmar en la tablet (QR): /my/signature exige login de portal, así que va con el token
visits.signature = async id => {
  const person = await readPerson(odooId(id))
  if (!person.x_sign_request_id) throw clientError(404, 'Este visitante no tiene solicitud de firma')
  const requestId = person.x_sign_request_id[0]
  const [item] = await odoo.search('sign.request.item', [['sign_request_id', '=', requestId]], ['state', 'access_token', 'signing_date'], { limit: 1 })
  return { state: item?.state ?? null, signed_at: item?.signing_date || null, url: item?.access_token ? odoo.url(`/sign/document/${requestId}/${item.access_token}`) : null, sign_on_tablet: !!person.x_sin_registro || !person.email }
}

// Solo registrados con email: los demás firman en la tablet con el contacto genérico
visits.resendSignature = async id => {
  const person = await readPerson(odooId(id))
  if (person.x_sin_registro || !person.email) throw clientError(400, 'Firma en la tablet: los no registrados y los contactos sin email no reciben correo de firma')
  if (!person.x_sign_request_id) throw clientError(404, 'Este visitante no tiene solicitud de firma')
  await odoo.call('sign.request', 'send_signature_accesses', [person.x_sign_request_id[0]])
  return { id: person.id }
}

// Compañías de Contactos por nombre o NIF
visits.companies = async q => {
  const text = cleanText(q, 60)
  if (text.length < 2) throw clientError(400, 'Escribe al menos 2 letras')
  return odoo.search('res.partner', [['is_company', '=', true], '|', ['name', 'ilike', text], ['vat', 'ilike', text]], ['name', 'vat', 'city', 'country_id'], { limit: 10, order: 'name' })
}

// Personas de una empresa o búsqueda por nombre o email
visits.contacts = async ({ q, companyId }) => {
  const text = cleanText(q, 60)
  const company = odooId(companyId)
  if (!company && text.length < 3) throw clientError(400, 'Escribe al menos 3 letras')
  const domain = [['is_company', '=', false], ...(company ? [['commercial_partner_id', '=', company]] : []), ...(text ? ['|', ['name', 'ilike', text], ['email', 'ilike', text]] : [])]
  const contacts = await odoo.search('res.partner', domain, ['name', 'function', 'email', 'phone', 'lang', 'commercial_partner_id'], { limit: 30, order: 'name' })
  return contacts.map(c => ({ ...c, lang: langOf(null, c.lang) }))
}

// Contacto nuevo dentro de la empresa de la visita, con la etiqueta Visitante
visits.createContact = async body => {
  const name = cleanText(body.name, 120)
  const email = cleanText(body.email, 120)
  if (!name) throw clientError(400, 'El contacto necesita nombre')
  if (email && !isEmail(email)) throw clientError(400, 'Email no válido')
  return odoo.create('res.partner', {
    name,
    email: email || false,
    phone: cleanText(body.phone, 40) || false,
    parent_id: odooId(body.company_id) || false,
    lang: ODOO_LANGS[langOf(body.lang)],
    category_id: [[4, VISITOR_TAG_ID]],
  })
}

module.exports = visits
