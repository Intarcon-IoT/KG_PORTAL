// Maqueta común de los correos con la estética del portal: tablas y estilos en línea, que es lo que respetan los clientes de correo
const LOGO = 'https://keyter-intarcon.com/wp-content/uploads/2025/04/KEYTER-GROUP-300x75.png'
const FONT = "'Manrope', 'Segoe UI', Helvetica, Arial, sans-serif"

// Todo dato que venga del usuario o de la BD pasa por aquí antes de entrar en el HTML
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const firstName = name => String(name || '').trim().split(/\s+/)[0] || 'Usuario'

// Bloques del cuerpo; reciben texto ya escapado salvo que se indique
const paragraph = (html, muted = false) => `<p style="margin:16px 0 0;font-size:${muted ? 13 : 15}px;line-height:1.6;color:${muted ? '#64748b' : '#475569'};">${html}</p>`

const button = (url, label) => `
  <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
    <tr>
      <td align="center" bgcolor="#111111" style="border-radius:10px;">
        <a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`

const note = html => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background:#f8f9fa;border:1px solid #eceef2;border-radius:12px;">
    <tr><td style="padding:12px 14px;font-size:13px;line-height:1.5;color:#334155;text-align:center;">${html}</td></tr>
  </table>`

// Filas etiqueta / valor (los valores se escapan aquí; mono para credenciales)
const details = (rows, { mono = false } = {}) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background:#f8f9fa;border:1px solid #eceef2;border-radius:12px;">
    <tr><td style="padding:6px 16px;text-align:left;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${rows.map(([label, value]) => `
        <tr>
          <td valign="top" style="padding:8px 12px 8px 0;width:110px;font-size:13px;color:#64748b;">${escapeHtml(label)}</td>
          <td valign="top" style="padding:8px 0;font-size:14px;font-weight:600;color:#111111;word-break:break-word;${mono ? "font-family:Consolas,'Courier New',monospace;" : ''}">${escapeHtml(value).replace(/\n/g, '<br>')}</td>
        </tr>`).join('')}
      </table>
    </td></tr>
  </table>`

// Etiqueta de estado (aprobada, rechazada…)
const TONES = { success: ['#f1f5ee', '#33662d'], danger: ['#fef2f2', '#b91c1c'], neutral: ['#f1f2f4', '#334155'] }
const badge = (label, tone = 'neutral') => `<span style="display:inline-block;margin-top:14px;padding:4px 12px;border-radius:999px;background:${TONES[tone][0]};color:${TONES[tone][1]};font-size:12px;font-weight:700;letter-spacing:.04em;">${escapeHtml(label)}</span>`

// Página completa centrada (salvo la tabla de detalles): eyebrow, título, bloques y pie. preheader es el resumen de la bandeja de entrada
const renderEmail = ({ subject, preheader = '', eyebrow = 'Portal KEYTER Group', title, blocks = [], footnote = '' }) => `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${escapeHtml(subject)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&display=swap" rel="stylesheet">
  </head>
  <body style="margin:0;padding:0;background:#f6f7f9;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #eceef2;border-radius:16px;">
            <tr>
              <td align="center" style="padding:32px 36px 0;">
                <img src="${LOGO}" alt="KEYTER Group" width="150" style="display:block;width:150px;height:auto;margin:0 auto;border:0;">
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:28px 36px ${footnote ? 0 : 32}px;font-family:${FONT};text-align:center;">
                <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#468131;">${escapeHtml(eyebrow)}</p>
                <h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:600;color:#111111;">${escapeHtml(title)}</h1>
                ${blocks.join('')}
              </td>
            </tr>
            ${footnote ? `
            <tr>
              <td style="padding:28px 36px 32px;font-family:${FONT};">
                <p style="margin:0;padding-top:20px;border-top:1px solid #f1f2f4;font-size:13px;line-height:1.6;color:#64748b;text-align:center;">${footnote}</p>
              </td>
            </tr>` : ''}
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
            <tr>
              <td style="padding:20px 36px 0;font-family:${FONT};font-size:11px;line-height:1.6;color:#94a3b8;text-align:center;">
                <span style="letter-spacing:.12em;font-weight:600;">KEYTER · INTARCON · GENAQ · KIO · KICONEX</span><br>
                © ${new Date().getFullYear()} KEYTER Group · Correo automático, no respondas a este mensaje.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

module.exports = { renderEmail, escapeHtml, firstName, paragraph, button, note, details, badge }
