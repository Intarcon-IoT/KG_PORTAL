const { BOOKING_STATUS } = require("../constants");

function bookingStatusTemplate({ nombre = "Usuario", status, booking }) {
  const isApproved = status === BOOKING_STATUS.APPROVED;
  const subject = isApproved ? "Reserva aprobada ✅" : "Reserva rechazada ❌";
  const statusText = isApproved ? "APROBADA" : "RECHAZADA";
  const statusColor = isApproved ? "#5BB133" : "#dc3545";

  const date = new Date(booking.start_date).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const startTime = booking.start_time.slice(0, 5);
  const endTime = booking.end_time.slice(0, 5);

  const html = `
  <!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${subject}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { background-color: #f1f3f5; font-family: Arial, sans-serif; }
        .email-container {
          max-width: 600px;
          margin: 40px auto;
          background: #fff;
          padding: 30px;
          border-radius: 12px;
          border: 1px solid #dee2e6;
        }
        .header { text-align: center; margin-bottom: 20px; }
        .status-box {
          border: 2px solid ${statusColor};
          background-color: ${isApproved ? "#e6f4ea" : "#f8e6e6"};
          color: ${statusColor};
          font-weight: bold;
          font-size: 1.2rem;
          text-align: center;
          padding: 10px;
          border-radius: 8px;
          margin: 20px 0;
        }
        ul { padding-left: 20px; }
        li { margin-bottom: 5px; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <img src="https://keyter-intarcon.com/wp-content/uploads/2025/04/KEYTER-GROUP-300x75.png" alt="KEYTER Group" />
        </div>

        <h2>Estimado/a ${nombre},</h2>
        <p>Nos dirigimos a usted para informarle de que su solicitud de reserva ha sido procesada.</p>

        <div class="status-box">${statusText}</div>

        <p><strong>Detalles de la reserva:</strong></p>
        <ul>
          <li><strong>Sala:</strong> ${booking.room_name}</li>
          <li><strong>Fecha:</strong> ${date}</li>
          <li><strong>Hora de inicio:</strong> ${startTime}</li>
          <li><strong>Hora de finalización:</strong> ${endTime}</li>
          <li><strong>Título:</strong> ${booking.title || "Sin título"}</li>
          ${booking.details ? `<li><strong>Observaciones:</strong> ${booking.details}</li>` : ""}
        </ul>

        <p>Para cualquier consulta adicional, le rogamos que contacte con el departamento de administración.</p>
        <p>Atentamente,<br><strong>KEYTER Group</strong></p>
      </div>
    </body>
  </html>
  `;

  const text = `
Estimado/a ${nombre},

Le informamos de que su solicitud de reserva ha sido ${statusText}.

Detalles de la reserva:
- Sala: ${booking.room_name}
- Fecha: ${date}
- Hora de inicio: ${startTime}
- Hora de finalización: ${endTime}
- Título: ${booking.title || "Sin título"}
${booking.details ? `- Observaciones: ${booking.details}` : ""}

Para cualquier consulta adicional, puede ponerse en contacto con el departamento de administración.

Atentamente,
KEYTER Group
`;

  return { subject, html, text };
}

module.exports = { bookingStatusTemplate };
