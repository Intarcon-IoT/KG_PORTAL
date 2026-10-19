// Borra artefactos regenerables (node_modules, builds, cachés y logs) de los servicios
// No toca los pnpm-lock.yaml: están versionados para que los builds sean reproducibles
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const groups = [
  { folder: 'backend', targets: ['backend/node_modules', 'backend/.eslintcache', 'backend/logs'] },
  { folder: 'frontend', targets: ['frontend/node_modules', 'frontend/dist', 'frontend/build', 'frontend/.eslintcache'] }
]

let removed = 0
for (const { folder, targets } of groups) {
  console.log(`\n\x1b[36m── ${folder} ──\x1b[0m`)
  for (const rel of targets) {
    const p = path.join(root, rel)
    if (!fs.existsSync(p)) continue
    fs.rmSync(p, { recursive: true, force: true })
    console.log(`\x1b[33m🗑  ${rel}\x1b[0m`)
    removed++
  }
}

console.log(removed ? `\n\x1b[32m✔ Limpiados ${removed} artefactos\x1b[0m` : '\n\x1b[32m✔ Nada que limpiar\x1b[0m')
