// Aviso de reserva aprobada o rechazada, con la maqueta del portal
const { BOOKING_STATUS } = require('../constants')
const { renderEmail, escapeHtml, firstName, paragraph, button, details, badge } = require('./layout')

// Las fechas de la BD son medianoche UTC: se formatean en UTC para no cambiar de día según el servidor
const formatDate = value => {
  const date = value instanceof Date ? value : new Date(String(value).slice(0, 10) + 'T00:00:00Z')
  const text = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function bookingStatusTemplate({ name = 'Usuario', status, booking, url }) {
  const approved = status === BOOKING_STATUS.APPROVED
  const title = booking.title || 'Sin título'
  const subject = `${approved ? 'Reserva aprobada' : 'Reserva rechazada'}: ${title} · Portal KEYTER Group`
  const when = `${String(booking.start_time).slice(0, 5)} – ${String(booking.end_time).slice(0, 5)}`
  const date = formatDate(booking.start_date)
  const rows = [['Título', title], ['Sala', booking.room_name], ['Fecha', date], ['Horario', when]]
  if (booking.details) rows.push(['Detalles', booking.details])

  const html = renderEmail({
    subject,
    preheader: `${title} · ${date}, ${when}`,
    eyebrow: 'Reservas de salas',
    title: approved ? 'Tu reserva está confirmada' : 'Tu reserva no se ha aprobado',
    blocks: [
      badge(approved ? 'Aprobada' : 'Rechazada', approved ? 'success' : 'danger'),
      paragraph(approved
        ? `Hola, ${escapeHtml(firstName(name))}. Tu solicitud se ha aprobado y la sala queda reservada para ti.`
        : `Hola, ${escapeHtml(firstName(name))}. Tu solicitud no se ha aprobado, normalmente porque se ha confirmado otra reserva en ese mismo tramo.`),
      details(rows),
      url ? button(url, approved ? 'Ver en el calendario' : 'Buscar otro horario') : '',
    ],
    footnote: approved
      ? 'Si ya no necesitas la sala, elimina la reserva desde el portal para dejarla libre.'
      : 'Puedes solicitar otro horario u otra sala desde el portal.',
  })

  const text = `${approved ? 'Tu reserva está confirmada' : 'Tu reserva no se ha aprobado'} · Portal KEYTER Group

Hola, ${firstName(name)}. ${approved ? 'Tu solicitud se ha aprobado y la sala queda reservada para ti.' : 'Tu solicitud no se ha aprobado, normalmente porque se ha confirmado otra reserva en ese mismo tramo.'}

${rows.map(([label, value]) => `${label}: ${value}`).join('\n')}
${url ? `\nPortal: ${url}\n` : ''}
${approved ? 'Si ya no necesitas la sala, elimina la reserva desde el portal para dejarla libre.' : 'Puedes solicitar otro horario u otra sala desde el portal.'}

KEYTER Group`

  return { subject, html, text }
}

module.exports = { bookingStatusTemplate }
