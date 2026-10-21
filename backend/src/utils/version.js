// Versión del portal: única fuente en el fichero VERSION de la raíz (AAAA.MM.N), leído al arrancar
const fs = require('fs')
const path = require('path')

const read = () => { try { return fs.readFileSync(path.join(__dirname, '../../../VERSION'), 'utf8').trim() } catch { return 'desconocida' } }
const current = read()

module.exports = { getVersion: () => current }
