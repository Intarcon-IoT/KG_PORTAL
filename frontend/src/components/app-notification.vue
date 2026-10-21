<!-- Avisos flotantes de la app; se montan aparte desde useNotificationStore -->
<template>
  <TransitionGroup tag="div" name="toast" class="toast-stack">
    <div
      v-for="n in notifications"
      :key="n.id"
      class="toast"
      :class="`toast-${n.type}`"
      :role="n.type === 'error' ? 'alert' : 'status'"
      @mouseenter="pause(n)"
      @mouseleave="resume(n)"
    >
      <span class="toast-icon"><i :class="icons[n.type]" /></span>
      <div class="toast-body">
        <strong v-if="n.title">{{ n.title }}</strong>
        <p>{{ n.message }}</p>
      </div>
      <button type="button" class="toast-close" aria-label="Cerrar" @click="remove(n.id)"><i class="fa-solid fa-xmark" /></button>
      <span class="toast-progress" :class="{ paused: n.paused }" :style="{ animationDuration: `${n.timeout}ms` }" />
    </div>
  </TransitionGroup>
</template>

<script>
const icons = { success: 'fa-solid fa-check', error: 'fa-solid fa-xmark', warning: 'fa-solid fa-exclamation', info: 'fa-solid fa-info' }
let lastId = 0

export default {
  name: 'AppNotification',
  data: () => ({ notifications: [], icons }),
  methods: {
    addNotification({ title = '', message = '', type = 'info', timeout = type === 'error' ? 5000 : 3500 }) {
      const n = { id: ++lastId, title, message, type: icons[type] ? type : 'info', timeout, remaining: timeout, paused: false }
      this.notifications.push(n)
      // Máximo 4 a la vez: se descarta la más antigua
      if (this.notifications.length > 4) this.remove(this.notifications[0].id)
      this.start(this.notifications.at(-1))
    },
    start(n) {
      n.startedAt = Date.now()
      n.timer = setTimeout(() => this.remove(n.id), n.remaining)
    },
    pause(n) {
      if (n.paused) return
      clearTimeout(n.timer)
      n.remaining -= Date.now() - n.startedAt
      n.paused = true
    },
    resume(n) {
      if (!n.paused) return
      n.paused = false
      this.start(n)
    },
    remove(id) {
      const n = this.notifications.find(x => x.id === id)
      if (n) clearTimeout(n.timer)
      this.notifications = this.notifications.filter(x => x.id !== id)
    },
  },
}
</script>

<style scoped>
.toast-stack {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 360px;
  max-width: calc(100vw - 32px);
  pointer-events: none;
}

.toast {
  --tone: #2563eb;
  --tint: #eff6ff;

  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: start;
  gap: 12px;
  padding: 14px 12px 16px 14px;
  overflow: hidden;
  border: 1px solid #eceef2;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 12px 32px -12px rgba(15, 23, 42, .28), 0 2px 6px rgba(15, 23, 42, .06);
  color: #111111;
  font-size: 14px;
  line-height: 1.45;
  pointer-events: auto;
}

.toast-success { --tone: #16a34a; --tint: #f0fdf4 }
.toast-error { --tone: #dc2626; --tint: #fef2f2 }
.toast-warning { --tone: #d97706; --tint: #fffbeb }

.toast-icon { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: var(--tint); color: var(--tone); font-size: 14px }

.toast-body { min-width: 0; padding-top: 5px }
.toast-body strong { display: block; margin-bottom: 2px; font-weight: 600 }
.toast-body p { margin: 0; color: #475569; overflow-wrap: anywhere }
.toast-body strong + p { font-size: 13.5px }
.toast-body p:only-child { color: #111111; font-weight: 500 }

.toast-close {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  font-size: 13px;
  cursor: pointer;
  transition: background-color .15s, color .15s;
}

.toast-close:hover { background: #f1f5f9; color: #111111 }
.toast-close:focus-visible { outline: 2px solid var(--tone); outline-offset: 1px }

/* Barra de tiempo restante: se detiene al pasar el ratón */
.toast-progress {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 3px;
  width: 100%;
  background: var(--tone);
  opacity: .7;
  transform-origin: left;
  animation: toast-progress linear forwards;
}

.toast-progress.paused { animation-play-state: paused }

@keyframes toast-progress { to { transform: scaleX(0) } }

/* Entrada desde la derecha y recolocación suave del resto al cerrar */
.toast-enter-active { transition: transform .35s cubic-bezier(.21, 1.02, .73, 1), opacity .35s }
.toast-leave-active { position: absolute; width: 100%; transition: transform .25s ease-in, opacity .25s ease-in }
.toast-enter-from { opacity: 0; transform: translateX(24px) }
.toast-leave-to { opacity: 0; transform: translateX(24px) scale(.98) }
.toast-move { transition: transform .3s ease }

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active, .toast-leave-active, .toast-move { transition: opacity .2s }
  .toast-enter-from, .toast-leave-to { transform: none }
}
</style>
