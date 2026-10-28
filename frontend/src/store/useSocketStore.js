import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { io } from 'socket.io-client'
import { sessionStore } from './session'
import router from '@/router'

// Socket.IO del portal: misma ruta que la API (/api/socket.io); `rooms` son los módulos a los que llegan avisos
const api = new URL(import.meta.env.VITE_API_URL, window.location.origin)
const RETRY_MS = 5000

export const useSocketStore = defineStore('socket', {
  state: () => ({ socket: null, connected: false, rooms: [] }),
  actions: {
    connect() {
      const token = sessionStore().auth.token
      if (this.socket || !token) return
      const socket = markRaw(io(api.origin, { path: `${api.pathname.replace(/\/?$/, '/')}socket.io`, auth: { token }, transports: ['websocket', 'polling'] }))
      socket.on('connect', () => { this.connected = true })
      socket.on('disconnect', () => { this.connected = false; this.rooms = [] })
      socket.on('session:rooms', rooms => { this.rooms = rooms })
      socket.on('session:expired', () => this.expire())
      // Un rechazo del servidor no se reintenta solo: sin sesión se sale; si Redis no responde, se reintenta
      socket.on('connect_error', error => {
        if (error.message === 'unauthorized') return this.expire()
        if (error.message === 'unavailable') setTimeout(() => this.socket === socket && socket.connect(), RETRY_MS)
      })
      this.socket = socket
    },
    disconnect() {
      this.socket?.disconnect()
      Object.assign(this, { socket: null, connected: false, rooms: [] })
    },
    expire() {
      this.disconnect()
      const session = sessionStore()
      session.auth.resetCredentials()
      localStorage.removeItem('session')
      router.push({ name: 'Log In' })
    },
    // Suscripción a un evento; devuelve la función para quitarla (en onBeforeUnmount)
    on(event, handler) {
      this.socket?.on(event, handler)
      return () => this.socket?.off(event, handler)
    },
  },
})
