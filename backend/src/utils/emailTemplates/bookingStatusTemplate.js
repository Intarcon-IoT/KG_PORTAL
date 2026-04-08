function bookingStatusTemplate({ nombre = "Usuario", status, booking }) {
  const isApproved = status === 'Approved';
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

        <h2>Hola ${nombre},</h2>
        <p>Tu reserva ha sido procesada:</p>

        <div class="status-box">${statusText}</div>

        <p><strong>Detalles de la reserva:</strong></p>
        <ul>
          <li><strong>Sala:</strong> ${booking.room_name}</li>
          <li><strong>Fecha:</strong> ${date}</li>
          <li><strong>Hora inicio:</strong> ${startTime}</li>
          <li><strong>Hora fin:</strong> ${endTime}</li>
          <li><strong>Título:</strong> ${booking.title || "Sin título"}</li>
          ${booking.details ? `<li><strong>Detalles:</strong> ${booking.details}</li>` : ""}
        </ul>

        <p>Si tienes alguna duda, contacta con administración.</p>
        <p>Un saludo,<br><strong>KEYTER Group</strong></p>
      </div>
    </body>
  </html>
  `;

  const text = `
Hola ${nombre},

Tu reserva ha sido ${statusText}.

Detalles:
- Sala: ${booking.room_name}
- Fecha: ${date}
- Inicio: ${startTime}
- Fin: ${endTime}
- Título: ${booking.title || "Sin título"}
${booking.details ? `- Detalles: ${booking.details}` : ""}

Un saludo,
KEYTER Group
`;

  return { subject, html, text };
}

module.exports = { bookingStatusTemplate };
