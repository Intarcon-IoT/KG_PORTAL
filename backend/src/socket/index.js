// Socket.IO bajo /api/socket.io (mismo proxy que la API). Solo admite sesiones del portal: cada socket entra en
// user:<uuid> y en la sala de cada módulo que puede ver; las salas se recalculan por si cambian sus permisos
const { Server } = require('socket.io')
const sessions = require('../utils/sessions')
const User = require('../models/user')
const permissions = require('../utils/permissions')

// Sala de cada módulo y el permiso que la abre
const ROOMS = { calls: 'calls.view', visits: 'visits.view' }
const RESYNC_MS = 60 * 1000

let io = null

const tokenOf = socket => {
  const raw = socket.handshake.auth?.token ?? socket.handshake.headers?.authorization
  return typeof raw === 'string' && raw ? raw.split(' ').pop() : null
}

// Lee la sesión con los permisos actuales; null si ya no vale, undefined si Redis no responde
const loadUser = async token => {
  const stored = await sessions.get(token)
  if (stored?.error) return undefined
  if (!stored) return null
  return (await User.refreshSession(JSON.parse(stored))) || null
}

const syncRooms = (socket, user) => {
  for (const [room, permission] of Object.entries(ROOMS)) {
    if (permissions.has(user, permission)) socket.join(room)
    else socket.leave(room)
  }
}

const initSocket = httpServer => {
  if (io) return io
  io = new Server(httpServer, {
    path: '/api/socket.io',
    cors: { origin: process.env.FRONTEND_CLIENT, methods: ['GET', 'POST'] },
    // Solo emite: los clientes no envían nada que justifique mensajes grandes ni esperas largas
    maxHttpBufferSize: 4096,
    connectTimeout: 10000,
  })

  io.use(async (socket, next) => {
    const token = tokenOf(socket)
    if (!token) return next(new Error('unauthorized'))
    const user = await loadUser(token)
    if (user === undefined) return next(new Error('unavailable'))
    if (!user) return next(new Error('unauthorized'))
    socket.data = { token, user }
    next()
  })

  io.on('connection', socket => {
    socket.join(`user:${socket.data.user.uuid}`)
    syncRooms(socket, socket.data.user)
    socket.emit('session:rooms', [...socket.rooms].filter(r => ROOMS[r]))

    const timer = setInterval(async () => {
      const user = await loadUser(socket.data.token)
      if (user === undefined) return
      if (!user) { socket.emit('session:expired'); return socket.disconnect(true) }
      socket.data.user = user
      syncRooms(socket, user)
      socket.emit('session:rooms', [...socket.rooms].filter(r => ROOMS[r]))
    }, RESYNC_MS)
    socket.on('disconnect', () => clearInterval(timer))
  })
  return io
}

const emitToUser = (uuid, event, payload) => { if (io && uuid) io.to(`user:${uuid}`).emit(event, payload) }

const emitToRoom = (room, event, payload) => { if (io && ROOMS[room]) io.to(room).emit(event, payload) }

module.exports = { initSocket, emitToUser, emitToRoom, ROOMS }
