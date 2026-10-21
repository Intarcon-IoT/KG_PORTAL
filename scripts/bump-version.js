// Sube la versión del fichero VERSION (AAAA.MM.N): N + 1 en el mismo mes, N = 1 al cambiar de mes
// Con --dry solo muestra la versión siguiente
const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, '..', 'VERSION')
const previous = fs.readFileSync(file, 'utf8').trim()
const [year, month, n] = previous.split('.')
const now = new Date()
const period = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`
const next = `${year}.${month}` === period ? `${period}.${Number(n) + 1}` : `${period}.1`

if (!process.argv.includes('--dry')) fs.writeFileSync(file, `${next}\n`)
console.log(`Versión: ${previous} → ${next}${process.argv.includes('--dry') ? ' (sin guardar)' : ''}`)
