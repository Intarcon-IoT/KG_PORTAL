function passwordResetTemplate(url, ttlMin = 10, nombre = "Usuario") {
  const subject = 'Restablecer contraseña';
  const html = `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Restablecer Contraseña</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
          .password-box {
            background-color: #f8f9fa;
            border: 2px dashed #5BB133;
            border-radius: 8px;
            padding: 15px;
            font-weight: bold;
            font-size: 1.25rem;
            text-align: center;
            margin-top: 20px;
            white-space: nowrap;
            overflow-x: auto;
            user-select: all;
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
        </style>
      </head>
      <body style="background-color: #f1f3f5;">
        <div class="email-body shadow">
          <div style="text-align: center;">
            <img src="https://keyter-intarcon.com/wp-content/uploads/2025/04/KEYTER-GROUP-300x75.png" alt="KEYTER Group Logo"/>
          </div>  
          <h2 class="text-green text-center">¡Hola ${nombre}!</h2>
          <p>Hemos recibido una solicitud para restablecer la contraseña de su cuenta. A continuación, le proporcionamos un enlace para que pueda cambiarla:</p>
          <div class="password-box">
            <a href="${url}" class="btn-keyter" target="_blank">Restablecer contraseña</a>
          </div>
          <p>Este enlace caduca en ${ttlMin} minutos.</p>
          <p>Si no solicitó este cambio, por favor ignore este correo.</p>
          <p>Un saludo, <br><strong>KEYTER Group.</strong></p>
        </div>
      </body>
    </html>`;

    const text = `Restablecer contraseña

    Hemos recibido una solicitud para restablecer la contraseña de su cuenta. A continuación, le proporcionamos un enlace para que pueda cambiarla:
    ${url}

    Este enlace caduca en ${ttlMin} minutos.

    Si no solicitó este cambio, por favor ignore este correo.

    Un saludo,
    KEYTER Group.`;

  return { subject, html, text };
}

module.exports = { passwordResetTemplate };

