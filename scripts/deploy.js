// Deploy en orden estricto: backend y luego frontend
// Aborta al primer fallo para no servir un front nuevo sin sus migraciones
const { spawnSync } = require('child_process')
const path = require('path')

const root = path.join(__dirname, '..')
const steps = [
  { name: 'BACKEND', command: 'pnpm run deploy', cwd: path.join(root, 'backend') },
  { name: 'FRONTEND', command: 'pnpm run deploy', cwd: path.join(root, 'frontend') }
]

for (const { name, command, cwd } of steps) {
  console.log(`\n\x1b[36m========== DEPLOY ${name} ==========\x1b[0m`)
  const res = spawnSync(command, { cwd, stdio: 'inherit', shell: true })
  if (res.error) { console.error(`\x1b[31m✖ No se pudo ejecutar deploy ${name}: ${res.error.message}\x1b[0m`); process.exit(1) }
  if (res.status !== 0) { console.error(`\x1b[31m✖ Deploy ${name} falló (exit ${res.status}). Abortado\x1b[0m`); process.exit(res.status) }
}

console.log('\n\x1b[32m✔ Deploy completo: backend y frontend\x1b[0m')
