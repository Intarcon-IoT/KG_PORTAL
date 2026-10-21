// Correo de recuperación de contraseña con la maqueta del portal
const { renderEmail, escapeHtml, firstName, paragraph, button, note } = require('./layout')

function passwordResetTemplate(url, ttlMin = 10, name = 'Usuario') {
  const subject = 'Restablece tu contraseña · Portal KEYTER Group'
  const html = renderEmail({
    subject,
    preheader: `Usa este enlace en los próximos ${ttlMin} minutos para elegir una contraseña nueva.`,
    title: 'Restablece tu contraseña',
    blocks: [
      paragraph(`Hola, ${escapeHtml(firstName(name))}. Hemos recibido una solicitud para cambiar la contraseña de tu cuenta. Pulsa el botón para elegir una nueva.`),
      button(url, 'Elegir nueva contraseña'),
      note(`<strong style="color:#111111;">El enlace caduca en ${ttlMin} minutos</strong> y solo sirve una vez.`),
      paragraph('Si el botón no funciona, copia este enlace en tu navegador:', true),
      `<p style="margin:6px 0 0;font-size:12px;line-height:1.5;word-break:break-all;"><a href="${escapeHtml(url)}" target="_blank" style="color:#468131;text-decoration:underline;">${escapeHtml(url)}</a></p>`,
    ],
    footnote: 'Si no has pedido este cambio, ignora este correo: tu contraseña seguirá siendo la misma.',
  })

  const text = `Restablece tu contraseña · Portal KEYTER Group

Hola, ${firstName(name)}. Hemos recibido una solicitud para cambiar la contraseña de tu cuenta.

Elige una nueva en este enlace:
${url}

El enlace caduca en ${ttlMin} minutos y solo sirve una vez.

Si no has pedido este cambio, ignora este correo: tu contraseña seguirá siendo la misma.

KEYTER Group`

  return { subject, html, text }
}

module.exports = { passwordResetTemplate }
