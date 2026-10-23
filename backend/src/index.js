require('dotenv').config();
require('./connections/mysql');

const app = require('./app');
const PORT = process.env.PORT || 3445;
// Solo local: en producción entra por el proxy de Apache. HOST=0.0.0.0 lo expone a la red
const HOST = process.env.HOST || '127.0.0.1'

// Aplica el prefijo /api globalmente
const express = require('express');
const wrapper = express();

wrapper.use('/api', app);

wrapper.listen(PORT, HOST, () => {
  console.log(`Servidor escuchando en ${HOST}:${PORT}`);
});

// Vigilancia de los servicios que lee /api/ready
require('./utils/health').startMonitoring()
