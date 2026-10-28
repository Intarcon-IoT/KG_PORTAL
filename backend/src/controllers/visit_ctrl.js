const visits = require('../utils/visitsOdoo')
const { emitToRoom } = require('../socket')

const visitCtrl = {}

// Errores de datos (400/404) tal cual; un fallo de Odoo se registra y el navegador recibe un aviso genérico
const handle = fn => async (req, res) => {
  try {
    res.json(await fn(req, res))
  } catch (error) {
    if (error.clientStatus) return res.status(error.clientStatus).json({ ok: false, message: error.message })
    console.error(`[VISITAS] ${req.method} ${req.originalUrl.split('?')[0]}: ${error.message}`)
    res.status(502).json({ ok: false, message: 'Odoo no ha respondido. Inténtalo de nuevo.' })
  }
}

// Escritura en Odoo: queda en el log de pm2 y los demás puestos de recepción recargan
const write = (what, fn) => handle(async (req, res) => {
  const result = await fn(req, res)
  console.log(`[VISITAS] ${typeof what === 'function' ? what(req, result) : what} (${res.locals.user.mail})`)
  emitToRoom('visits', 'visits:changed', { by: res.locals.user.uuid })
  return result
})

visitCtrl.options = handle(() => visits.options())
visitCtrl.hosts = handle(() => visits.hosts())
visitCtrl.list = handle(req => visits.list({ date: req.query.date, visitTo: req.query.visit_to }))
visitCtrl.calendar = handle(req => visits.calendar({ from: req.query.from, to: req.query.to, visitTo: req.query.visit_to }))
visitCtrl.detail = handle(req => visits.detail(req.params.id))
visitCtrl.companies = handle(req => visits.companies(req.query.q))
visitCtrl.contacts = handle(req => visits.contacts({ q: req.query.q, companyId: req.query.company_id }))
visitCtrl.signature = handle(req => visits.signature(req.params.id))

visitCtrl.create = write((req, r) => `Visita ${r.id} nueva con ${r.people} visitantes`, req => visits.create(req.body))
visitCtrl.update = write(req => `Visita ${req.params.id} modificada`, req => visits.update(req.params.id, req.body))
visitCtrl.addVisitors = write(req => `Visitantes añadidos a la visita ${req.params.id}`, req => visits.addVisitors(req.params.id, req.body))
const ACTION_NAMES = { 'check-in': 'Entrada', 'check-out': 'Salida', cancel: 'Cancelación' }

visitCtrl.visitAction = action => write((req, r) => `${ACTION_NAMES[action]} de ${r.ids.length} visitantes de la visita ${r.id}`, req => visits.visitAction(req.params.id, action))
visitCtrl.notify = write(req => `Aviso al anfitrión de la visita ${req.params.id}`, req => visits.notify(req.params.id, req.body.message))
visitCtrl.personAction = action => write(req => `${ACTION_NAMES[action]} del visitante ${req.params.id}`, req => visits.personAction(req.params.id, action))
visitCtrl.personNotify = write(req => `Aviso al anfitrión del visitante ${req.params.id}`, req => visits.personNotify(req.params.id, req.body.message))
visitCtrl.completePerson = write(req => `Datos del visitante ${req.params.id} completados`, req => visits.completePerson(req.params.id, req.body))
visitCtrl.resendSignature = write(req => `Reenvío de la firma del visitante ${req.params.id}`, req => visits.resendSignature(req.params.id))
visitCtrl.createContact = write((req, r) => `Contacto visitante ${r.id} nuevo`, req => visits.createContact(req.body))

module.exports = visitCtrl
