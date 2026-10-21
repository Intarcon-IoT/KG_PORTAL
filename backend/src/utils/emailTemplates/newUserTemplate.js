// Correo de bienvenida con las credenciales de acceso, con la maqueta del portal
const { renderEmail, escapeHtml, firstName, paragraph, button, details, note } = require('./layout')

function newUserTemplate(name = 'Usuario', email, password, loginUrl) {
  const subject = 'Tu acceso al Portal KEYTER Group'
  const html = renderEmail({
    subject,
    preheader: 'Ya tienes cuenta en el Portal KEYTER Group: aquí tienes tus datos de acceso.',
    title: 'Te damos la bienvenida',
    blocks: [
      paragraph(`Hola, ${escapeHtml(firstName(name))}. Se ha creado tu cuenta en el Portal KEYTER Group, desde donde puedes reservar las salas de reuniones del grupo. Estos son tus datos de acceso:`),
      details([['Usuario', email], ['Contraseña', password]], { mono: true }),
      loginUrl ? button(loginUrl, 'Entrar al portal') : '',
      note('<strong style="color:#111111;">Cambia esta contraseña en tu primer acceso</strong> desde Mi cuenta, en el menú de tu usuario.'),
    ],
    footnote: 'Si no esperabas este correo, contacta con el administrador del portal.',
  })

  const text = `Tu acceso al Portal KEYTER Group

Hola, ${firstName(name)}. Se ha creado tu cuenta en el Portal KEYTER Group. Estos son tus datos de acceso:

Usuario: ${email}
Contraseña: ${password}
${loginUrl ? `\nEntra en: ${loginUrl}\n` : ''}
Cambia esta contraseña en tu primer acceso desde Mi cuenta, en el menú de tu usuario.

Si no esperabas este correo, contacta con el administrador del portal.

KEYTER Group`

  return { subject, html, text }
}

module.exports = { newUserTemplate }
