function newUserTemplate(nombre = "Usuario", email, password) {
  const subject = 'Credenciales de acceso - Kibooking';
  const html = `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Credenciales de acceso</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
          .credentials-box {
            background-color: #f8f9fa;
            border: 2px dashed #5BB133;
            border-radius: 8px;
            padding: 15px;
            font-weight: bold;
            font-size: 1.1rem;
            text-align: left;
            margin-top: 20px;
            margin-bottom: 20px;
            font-family: monospace;
          }
          .email-body {
            max-width: 600px;
            margin: auto;
            padding: 30px;
            background-color: #ffffff;
            border: 1px solid #dee2e6;
            border-radius: 10px;
          }
          .text-green {
            color: #5BB133;
            text-align: center;
          }
          .btn-keyter {
            background-color: #5BB133;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            text-decoration: none !important;
            display: inline-block;
          }
          .btn-keyter:hover {
            background-color: #4d9b2b;
          }
          .credential-label {
            color: #5BB133;
            font-weight: bold;
            min-width: 100px;
            display: inline-block;
          }
        </style>
      </head>
      <body style="background-color: #f1f3f5;">
        <div class="email-body shadow">
          <div style="text-align: center;">
            <img src="https://keyter-intarcon.com/wp-content/uploads/2025/04/KEYTER-GROUP-300x75.png" alt="KEYTER Group Logo"/>
          </div>  
          <h2 class="text-green text-center">¡Bienvenido/a ${nombre}!</h2>
          <p>Se ha creado una cuenta para usted en el sistema de gestión Kibooking. A continuación le proporcionamos sus credenciales de acceso:</p>
          
          <div class="credentials-box">
            <div><span class="credential-label">Usuario:</span> ${email}</div>
            <div><span class="credential-label">Contraseña:</span> ${password}</div>
          </div>

          <p>Por motivos de seguridad, le recomendamos cambiar su contraseña tras el primer inicio de sesión.</p>
          <p>Un saludo, <br><strong>KEYTER Group.</strong></p>
        </div>
      </body>
    </html>`;

  const text = `Credenciales de acceso - Kibooking

  ¡Bienvenido/a ${nombre}!

  Se ha creado una cuenta para usted en el sistema de gestión Kibooking. A continuación le proporcionamos sus credenciales de acceso:

  Usuario: ${email}
  Contraseña: ${password}

  Por motivos de seguridad, le recomendamos cambiar su contraseña tras el primer inicio de sesión.

  Un saludo,
  KEYTER Group.`;

  return { subject, html, text };
}

module.exports = { newUserTemplate };
