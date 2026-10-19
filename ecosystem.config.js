// Procesos de KG Portal en producción, lanzados con PM2
module.exports = {
  apps: [
    {
      name: 'KG_00_BackEnd',
      cwd: '/var/www/KG_PORTAL/backend',
      // Node directo (sin pnpm delante) para que SIGINT llegue al proceso
      script: 'src/index.js',
      interpreter: '/usr/bin/node',
      exec_mode: 'fork_mode',
      autorestart: true,
      watch: false,
      restart_delay: 2000
    },
    {
      name: 'KG_01_FrontEnd',
      cwd: '/var/www/KG_PORTAL/frontend',
      script: '/usr/bin/pnpm',
      args: 'run prod',
      interpreter: '/usr/bin/node',
      exec_mode: 'fork_mode',
      autorestart: true,
      watch: false,
      restart_delay: 2000
    }
  ]
}
