const express = require("express");

const cors = require("cors");

const app = express();
const server_port = process.env.PORT;

// SETTING
app.set("port", server_port); //Puerto donde va a correr el servidor backend.

// Configure Header HTTPS
const frontend_client = process.env.FRONTEND_CLIENT;
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", frontend_client);
  res.header(
    "Access-Control-Allow-Headers",
    "Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.header("Allow", "GET, POST, OPTIONS, PUT, DELETE");
  next();
});

//HTTP
app.use(cors()); //Servidor para intercambio de información

//el servidor utilizará tanto formato json com text-plain para intercambio información
app.use(express.json());
app.use(express.text({ type: 'text/plain' }));
// En Express 5 req.body es undefined si la petición no trae cuerpo
app.use((req, res, next) => { req.body ??= {}; next() })

// ROUTES
// rutas para interpretar las peticiones en la API
app.use("/rooms", require("./routes/rooms"));
app.use("/facilities", require("./routes/facilities"));
app.use("/users", require("./routes/users"));
app.use("/tenants", require("./routes/tenants"));
app.use("/bookings", require("./routes/bookings"));
app.use("/system", require("./routes/system"));
app.use("/password-reset", require("./routes/password_reset"));

app.use("/v0/rooms", require("./routes/v0/rooms"));

// Errores no controlados: JSON sin traza; el detalle queda en el log
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err)
  const status = err.status >= 400 && err.status < 500 ? err.status : 500
  res.status(status).json({ ok: false, message: status === 500 ? 'Error interno del servidor' : 'Petición no válida' })
})


module.exports = app;
