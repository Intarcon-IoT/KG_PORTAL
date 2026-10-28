// Estados, horas y etiquetas de las visitas de recepción. Odoo da las fechas en UTC ('YYYY-MM-DD HH:mm:ss'); se
// muestran siempre en hora de Madrid
const ZONE = 'Europe/Madrid'

export const odooMs = value => value ? Date.parse(value.replace(' ', 'T') + 'Z') : null
const fmt = (value, options) => value ? new Intl.DateTimeFormat('es-ES', { timeZone: ZONE, ...options }).format(odooMs(value)) : ''
export const odooTime = value => value ? fmt(value, { hour: '2-digit', minute: '2-digit' }) : '–'
export const odooShort = value => fmt(value, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
export const odooFull = value => fmt(value, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
export const odooLongDate = value => fmt(value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
export const msTime = ms => new Intl.DateTimeFormat('es-ES', { timeZone: ZONE, hour: '2-digit', minute: '2-digit' }).format(ms)

// Día YYYY-MM-DD en Madrid de una fecha de Odoo o de un instante
export const madridDay = ms => new Date(ms).toLocaleDateString('sv-SE', { timeZone: ZONE })
export const odooDay = value => value ? madridDay(odooMs(value)) : null
export const madridToday = () => madridDay(Date.now())

export const longDay = key => {
  const [y, m, d] = key.split('-').map(Number)
  const text = new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// 45 min · 1 h 20 min
export const humanDuration = ms => {
  const minutes = Math.max(0, Math.round(ms / 60000))
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`
}

// planned con la hora ya pasada: «con retraso» el mismo día, «no se presentó» un día anterior
export const visitState = (visit, nowMs) => {
  if (visit.status !== 'planned' || !visit.no_show) return visit.status
  return odooDay(visit.date) === madridDay(nowMs) ? 'late' : 'no_show'
}

export const personState = (person, nowMs) => {
  if (person.state !== 'planned' || !person.check_in || odooMs(person.check_in) >= nowMs) return person.state
  return odooDay(person.check_in) === madridDay(nowMs) ? 'late' : 'no_show'
}

export const STATES = ['planned', 'late', 'checked_in', 'checked_out', 'no_show', 'canceled']
export const STATE_LABELS = { planned: 'Prevista', late: 'Con retraso', checked_in: 'Dentro', checked_out: 'Finalizada', no_show: 'No se presentó', canceled: 'Cancelada' }
export const STATE_TONES = { planned: 'info', late: 'warning', checked_in: 'ok', checked_out: 'muted', no_show: 'danger', canceled: 'muted' }
export const STATE_COLORS = { planned: '#2563eb', late: '#d97706', checked_in: '#5bb133', checked_out: '#94a3b8', no_show: '#dc2626', canceled: '#cbd5e1' }

export const signatureTag = person => {
  if (person.signature === 'signed') return { text: 'Registro firmado', tone: 'ok' }
  if (person.signature === 'none') return { text: 'Sin firma', tone: 'muted' }
  return { text: person.sign_on_tablet ? 'Firma en tablet' : 'Firma pendiente', tone: 'warning' }
}

export const infoSentLabel = person => {
  if (person.info_sent_at) return `Info previa ${odooShort(person.info_sent_at)}`
  if (person.email) return 'Sin info previa'
  return person.registered ? 'Contacto sin email' : 'No registrado · sin email'
}

export const labelOf = (list, key) => list?.find(([value]) => value === key)?.[1] ?? null
export const companyName = visit => visit.company?.[1] ?? null
export const visitTitle = visit => companyName(visit) || visit.persons[0]?.name || ''
export const visitKey = visit => visit.id ? `v${visit.id}` : `p${visit.persons[0]?.id}`

export const LANGS = [{ value: 'es', title: 'ES' }, { value: 'en', title: 'EN' }, { value: 'fr', title: 'FR' }]
export const isEmail = value => /^\S+@\S+\.\S+$/.test(value)
