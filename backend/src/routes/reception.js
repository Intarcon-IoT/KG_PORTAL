const { Router } = require('express')
const router = Router()

const visit = require('../controllers/visit_ctrl')
const { AuthMiddleware, can } = require('../middlewares/authMiddleware')

const view = can('visits.view')
const manage = can('visits.manage')

router.use(AuthMiddleware)

// Visitas (las rutas fijas van antes de /visits/:id)
router.route('/visits')
  .get(view, visit.list) //VISITAS DEL DÍA + DENTRO + SUELTAS DEL KIOSCO
  .post(manage, visit.create) //VISITA NUEVA CON SUS VISITANTES
router.get('/visits/options', view, visit.options) //DESPLEGABLES MOTIVO / VISITA A / TIPO
router.get('/visits/hosts', view, visit.hosts) //ANFITRIONES POSIBLES
router.get('/visits/calendar', view, visit.calendar) //CALENDARIO: PASADAS Y FUTURAS
router.get('/visits/companies', manage, visit.companies) //COMPAÑÍAS DE CONTACTOS
router.route('/visits/contacts')
  .get(manage, visit.contacts) //PERSONAS DE CONTACTOS
  .post(manage, visit.createContact) //CONTACTO VISITANTE NUEVO
router.route('/visits/:id')
  .get(view, visit.detail) //FICHA COMPLETA + HISTORIAL
  .patch(manage, visit.update) //CAMBIAR CABECERA
router.post('/visits/:id/visitors', manage, visit.addVisitors) //AÑADIR VISITANTES
router.post('/visits/:id/check-in', manage, visit.visitAction('check-in')) //ENTRADA DE TODOS (UN AVISO)
router.post('/visits/:id/check-out', manage, visit.visitAction('check-out')) //SALIDA DE TODOS
router.post('/visits/:id/cancel', manage, visit.visitAction('cancel')) //CANCELAR LOS QUE NO HAN LLEGADO
router.post('/visits/:id/notify', manage, visit.notify) //AVISAR DE NUEVO AL ANFITRIÓN
router.patch('/visitors/:id', manage, visit.completePerson) //COMPLETAR EMAIL / TELÉFONO
router.post('/visitors/:id/check-in', manage, visit.personAction('check-in')) //ENTRADA DE UNA PERSONA
router.post('/visitors/:id/check-out', manage, visit.personAction('check-out')) //SALIDA DE UNA PERSONA
router.post('/visitors/:id/cancel', manage, visit.personAction('cancel')) //CANCELAR UNA PERSONA
router.post('/visitors/:id/notify', manage, visit.personNotify) //AVISO DE UNA VISITA SUELTA
router.get('/visitors/:id/signature', manage, visit.signature) //ENLACE DE FIRMA (QR / TABLET)
router.post('/visitors/:id/signature/resend', manage, visit.resendSignature) //REENVIAR CORREO DE FIRMA

module.exports = router
