// Lint de backend y frontend: ejecuta los dos aunque uno falle y sale 1 si alguno tiene errores
// Comando como string + shell:true por compatibilidad con pnpm.cmd en Windows
const { spawnSync } = require('child_process')
const path = require('path')

const root = path.join(__dirname, '..')
const targets = [
  { name: 'BACKEND', command: 'pnpm run lint', cwd: path.join(root, 'backend') },
  { name: 'FRONTEND', command: 'pnpm run lint', cwd: path.join(root, 'frontend') }
]

let failed = false
for (const { name, command, cwd } of targets) {
  console.log(`\n\x1b[36m========== LINT ${name} ==========\x1b[0m`)
  const res = spawnSync(command, { cwd, stdio: 'inherit', shell: true })
  if (res.error) { console.error(`\x1b[31m✖ No se pudo ejecutar ${name}: ${res.error.message}\x1b[0m`); failed = true; continue }
  if (res.status !== 0) failed = true
}

console.log('')
if (failed) { console.error('\x1b[31m✖ Lint encontró errores\x1b[0m'); process.exit(1) }
console.log('\x1b[32m✔ Lint OK en backend y frontend\x1b[0m')
