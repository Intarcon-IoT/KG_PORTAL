/* CONEXION CON MYSQL */
const mysql = require('mysql2');

// 10 s: con la base caída se falla rápido en vez de colgar la petición; keep-alive para que no corten las ociosas
const pool = mysql.createPool({
  connectionLimit: 64,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_DATABASE,
  connectTimeout: 10000,
  enableKeepAlive: true,
  timezone: '+00:00'
});

// Sin throw: el proceso sigue vivo, el pool reintenta en cada consulta y /ready da la base como caída
pool.query('SELECT 1 + 1 AS solution', error => {
  if (error) return console.error(`MYSQL - No se pudo conectar al arrancar: ${error.code || ''} ${error.message}`)
  console.log('Database connection create')
})

module.exports = {
  pool: pool,
};
