<!-- Solicitudes pendientes agrupadas en series, con filtros y detección de solapes -->
<script setup>
import { ref, computed } from 'vue'
import OverlappingBookingModal from '../modals/OverlappingBookingModal.vue'
import { BOOKING_STATUS } from '@/utils/constants'

const props = defineProps({
  bookings: { type: Array, required: true, default: () => [] },
  rooms: { type: Array, default: () => [] },
  facilities: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update-status'])

const selectedRoom = ref(null)
const selectedUser = ref(null)
const selectedDate = ref([])
const menu = ref(false)
const confirmModal = ref(false)
const modalBooking = ref(null)
const expanded = ref(new Set())

const startOfDay = date => { const d = new Date(date); d.setHours(0, 0, 0, 0); return d }
const toMinutes = time => time.split(':').map(Number).reduce((h, m) => h * 60 + m, 0)

const filteredBookings = computed(() => props.bookings.filter(booking => {
  if (selectedRoom.value && booking.room_uuid !== selectedRoom.value) return false
  if (selectedUser.value && booking.user_uuid !== selectedUser.value) return false
  if (!selectedDate.value?.length) return true
  const from = startOfDay(selectedDate.value[0])
  const to = startOfDay(selectedDate.value.at(-1))
  to.setHours(23, 59, 59, 999)
  const date = startOfDay(booking.start_date)
  return date >= from && date <= to
}))

// Reservas pendientes que se solapan entre sí en la misma sala y día
const overlappingBookings = computed(() => {
  const overlaps = new Set()
  const list = filteredBookings.value
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const [a, b] = [list[i], list[j]]
      if (a.room_uuid !== b.room_uuid || new Date(a.start_date).toDateString() !== new Date(b.start_date).toDateString()) continue
      if (toMinutes(a.start_time) < toMinutes(b.end_time) && toMinutes(b.start_time) < toMinutes(a.end_time)) { overlaps.add(a.uuid); overlaps.add(b.uuid) }
    }
  }
  return overlaps
})

// Una serie son reservas del mismo usuario, sala, título, detalle y horario; las que tienen conflicto van sueltas
const items = computed(() => {
  const groups = new Map()
  const single = []
  for (const booking of filteredBookings.value) {
    if (overlappingBookings.value.has(booking.uuid)) { single.push({ ...booking, isGroup: false, id: booking.uuid }); continue }
    const key = `${booking.user_uuid}-${booking.room_uuid}-${booking.title}-${booking.details}-${booking.start_time}-${booking.end_time}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(booking)
  }
  for (const [key, list] of groups) {
    if (list.length === 1) { single.push({ ...list[0], isGroup: false, id: list[0].uuid }); continue }
    list.sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    single.push({ ...list[0], isGroup: true, id: `group-${key}`, bookings: list, end_date: list.at(-1).start_date, count: list.length })
  }
  return single.sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
})

const roomOf = uuid => props.rooms.find(r => r.uuid === uuid) || null
const facilityOf = uuid => { const room = roomOf(uuid); return room ? props.facilities.find(f => f.uuid === room.facility_uuid) || null : null }
const userName = item => item.name || 'Usuario'
// El filtro ofrece solo a quien tiene solicitudes: no hace falta poder ver usuarios para validar
const users = computed(() => [...new Map(props.bookings.map(b => [b.user_uuid, { uuid: b.user_uuid, name: userName(b) }])).values()].sort((a, b) => a.name.localeCompare(b.name)))

const formatDay = date => new Date(date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
const formatShort = date => new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
const formatTime = time => time?.slice(0, 5) || ''

const dateLabel = computed(() => {
  const dates = selectedDate.value
  if (!dates?.length) return ''
  const [from, to] = [new Date(dates[0]), new Date(dates.at(-1))]
  return dates.length === 1 || from.toDateString() === to.toDateString() ? from.toLocaleDateString('es-ES') : `${from.toLocaleDateString('es-ES')} – ${to.toLocaleDateString('es-ES')}`
})

const setRange = (from, to) => { selectedDate.value = [from, to]; menu.value = false }
const setToday = () => setRange(new Date(), new Date())
const setThisWeek = () => { const first = startOfDay(new Date()); first.setDate(first.getDate() - (first.getDay() || 7) + 1); const last = new Date(first); last.setDate(first.getDate() + 6); setRange(first, last) }
const setThisMonth = () => { const now = new Date(); setRange(new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0)) }

const hasFilters = computed(() => !!(selectedRoom.value || selectedUser.value || selectedDate.value?.length))
const clearFilters = () => { selectedRoom.value = null; selectedUser.value = null; selectedDate.value = [] }

const toggle = id => { const next = new Set(expanded.value); next.has(id) ? next.delete(id) : next.add(id); expanded.value = next }

const setStatus = (booking, status) => emit('update-status', { uuid: booking.uuid, status })
const setGroupStatus = (group, status) => group.bookings.forEach(b => setStatus(b, status))

const approve = item => {
  if (item.isGroup) return setGroupStatus(item, BOOKING_STATUS.APPROVED)
  if (!overlappingBookings.value.has(item.uuid)) return setStatus(item, BOOKING_STATUS.APPROVED)
  modalBooking.value = item
  confirmModal.value = true
}
const reject = item => item.isGroup ? setGroupStatus(item, BOOKING_STATUS.REJECTED) : setStatus(item, BOOKING_STATUS.REJECTED)

const confirmApproval = () => {
  if (modalBooking.value) setStatus(modalBooking.value, BOOKING_STATUS.APPROVED)
  cancelApproval()
}
const cancelApproval = () => { modalBooking.value = null; confirmModal.value = false }
</script>

<template>
  <div class="vlist">
    <div class="filters">
      <v-autocomplete autocomplete="off" v-model="selectedRoom" :items="rooms" item-title="name" item-value="uuid" placeholder="Todas las salas" prepend-inner-icon="fa-solid fa-door-open" variant="outlined" density="compact" hide-details clearable class="filter" />
      <v-autocomplete autocomplete="off" v-model="selectedUser" :items="users" item-title="name" item-value="uuid" placeholder="Todos los usuarios" prepend-inner-icon="fa-regular fa-user" variant="outlined" density="compact" hide-details clearable class="filter" />
      <v-menu v-model="menu" :close-on-content-click="false" location="bottom end">
        <template #activator="{ props: menuProps }">
          <v-text-field autocomplete="off" v-bind="menuProps" :model-value="dateLabel" placeholder="Cualquier fecha" prepend-inner-icon="fa-regular fa-calendar" variant="outlined" density="compact" hide-details readonly clearable class="filter" @click:clear="selectedDate = []" />
        </template>
        <div class="date-menu">
          <div class="date-presets">
            <button type="button" @click="setToday">Hoy</button>
            <button type="button" @click="setThisWeek">Esta semana</button>
            <button type="button" @click="setThisMonth">Este mes</button>
          </div>
          <v-date-picker v-model="selectedDate" multiple="range" color="#111111" hide-header control-variant="modal" @update:model-value="v => v?.length > 1 && (menu = false)" />
        </div>
      </v-menu>
      <button v-if="hasFilters" type="button" class="clear" @click="clearFilters">Limpiar filtros</button>
    </div>

    <div v-if="loading && !items.length" class="empty">
      <v-progress-circular indeterminate size="28" width="3" color="#111111" />
      <p>Cargando solicitudes…</p>
    </div>

    <div v-else-if="!items.length" class="empty">
      <span class="empty-icon"><i class="fa-solid fa-check" /></span>
      <h3>{{ hasFilters ? 'Sin resultados' : 'Todo al día' }}</h3>
      <p>{{ hasFilters ? 'Ninguna solicitud coincide con los filtros.' : 'No hay reservas pendientes de validación.' }}</p>
    </div>

    <ul v-else class="requests">
      <li v-for="item in items" :key="item.id" class="request" :style="{ '--tone': facilityOf(item.room_uuid)?.color || '#94a3b8' }">
        <div class="request-main">
          <div class="request-title">
            <h3>{{ item.title }}</h3>
            <span v-if="item.isGroup" class="tag">Serie · {{ item.count }} fechas</span>
            <span v-if="overlappingBookings.has(item.uuid)" class="tag tag-warn"><i class="fa-solid fa-triangle-exclamation" /> Se solapa con otra solicitud</span>
          </div>

          <div class="request-meta">
            <span><i class="fa-solid fa-door-open" /> {{ roomOf(item.room_uuid)?.name || 'Sala desconocida' }}<small v-if="facilityOf(item.room_uuid)"> · {{ facilityOf(item.room_uuid).name }}</small></span>
            <span><i class="fa-regular fa-user" /> {{ userName(item) }}</span>
            <span><i class="fa-regular fa-calendar" /> {{ item.isGroup ? `${formatShort(item.start_date)} – ${formatShort(item.end_date)}` : formatDay(item.start_date) }}</span>
            <span><i class="fa-regular fa-clock" /> {{ formatTime(item.start_time) }} – {{ formatTime(item.end_time) }}</span>
          </div>

          <button v-if="item.isGroup" type="button" class="series-toggle" @click="toggle(item.id)">
            {{ expanded.has(item.id) ? 'Ocultar fechas' : 'Ver fechas' }} <i class="fa-solid fa-chevron-down" :class="{ open: expanded.has(item.id) }" />
          </button>
          <div v-if="item.isGroup && expanded.has(item.id)" class="series-dates">
            <span v-for="b in item.bookings" :key="b.uuid">{{ formatDay(b.start_date) }}</span>
          </div>
        </div>

        <div class="request-actions">
          <v-btn variant="outlined" class="kg-btn kg-btn-danger-ghost" :disabled="loading" @click="reject(item)">{{ item.isGroup ? 'Rechazar serie' : 'Rechazar' }}</v-btn>
          <v-btn color="primary" variant="flat" class="kg-btn" :disabled="loading" @click="approve(item)">{{ item.isGroup ? 'Aprobar serie' : 'Aprobar' }}</v-btn>
        </div>
      </li>
    </ul>

    <OverlappingBookingModal
      :model-value="confirmModal"
      :booking="modalBooking"
      :room="modalBooking ? roomOf(modalBooking.room_uuid) : null"
      :facility="modalBooking ? facilityOf(modalBooking.room_uuid) : null"
      @update:model-value="confirmModal = $event"
      @confirm="confirmApproval"
      @cancel="cancelApproval"
    />
  </div>
</template>

<style scoped>
/* Filtros */
.filters { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; padding: 12px; border: 1px solid #eceef2; border-radius: 14px; background: #ffffff }
.filter { flex: 1 1 220px; max-width: 320px }
.filter :deep(.v-field) { border-radius: 10px; font-size: .875rem }
.filter :deep(.v-field__outline) { --v-field-border-opacity: 1; color: #e5e7eb }
.filter :deep(.v-field--focused .v-field__outline) { color: #111111 }
.filter :deep(.v-field__prepend-inner .v-icon) { font-size: .8rem; color: #94a3b8 }
.clear { margin-left: auto; padding: 6px 10px; border: 0; border-radius: 8px; background: transparent; color: #111111; font: inherit; font-size: .85rem; font-weight: 600; cursor: pointer }
.clear:hover { background: #f4f5f7 }

.date-menu { overflow: hidden; border: 1px solid #eceef2; border-radius: 14px; background: #ffffff; box-shadow: 0 16px 40px -12px rgba(15, 23, 42, .3) }
.date-presets { display: flex; gap: 6px; padding: 12px 12px 0 }
.date-presets button { padding: 6px 12px; border: 1px solid #e5e7eb; border-radius: 999px; background: #ffffff; color: #334155; font: inherit; font-size: .8rem; font-weight: 600; cursor: pointer }
.date-presets button:hover { border-color: #111111; color: #111111 }

/* Solicitudes */
.requests { display: flex; flex-direction: column; gap: 10px; margin: 0; padding: 0; list-style: none }

.request { position: relative; display: flex; align-items: center; gap: 24px; padding: 18px 20px 18px 24px; overflow: hidden; border: 1px solid #eceef2; border-radius: 14px; background: #ffffff; transition: box-shadow .15s }
.request::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--tone) }
.request:hover { box-shadow: 0 8px 24px -16px rgba(15, 23, 42, .35) }

.request-main { flex: 1; min-width: 0 }
.request-title { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 10px; margin-bottom: 8px }
.request-title h3 { margin: 0; font-size: 1rem; font-weight: 600; overflow-wrap: anywhere }

.tag { padding: 2px 10px; border-radius: 999px; background: #eceef2; color: #334155; font-size: .72rem; font-weight: 600; white-space: nowrap }
.tag-warn { background: #fff7ed; color: #b45309 }

.request-meta { display: flex; flex-wrap: wrap; gap: 6px 20px; font-size: .85rem; color: #475569 }
.request-meta i { width: 14px; margin-right: 4px; color: #94a3b8; text-align: center }
.request-meta small { font-size: inherit; color: #94a3b8 }

.series-toggle { display: inline-flex; align-items: center; gap: 6px; margin-top: 10px; padding: 0; border: 0; background: transparent; color: #111111; font: inherit; font-size: .8rem; font-weight: 600; cursor: pointer }
.series-toggle i { font-size: .6rem; transition: transform .15s }
.series-toggle i.open { transform: rotate(180deg) }
.series-dates { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px }
.series-dates span { padding: 3px 10px; border: 1px solid #e5e7eb; border-radius: 999px; font-size: .78rem; color: #334155 }

.request-actions { display: flex; flex-shrink: 0; gap: 8px }

/* Vacío y carga */
.empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 64px 16px; border: 1px dashed #e5e7eb; border-radius: 14px; background: #ffffff; text-align: center }
.empty-icon { display: grid; place-items: center; width: 48px; height: 48px; margin-bottom: 8px; border-radius: 50%; background: #f1f5ee; color: #468131; font-size: 1.1rem }
.empty h3 { margin: 0; font-size: 1rem; font-weight: 600 }
.empty p { margin: 0; font-size: .875rem; color: #64748b }

@media (width < 760px) {
  .filter { max-width: none }
  .request { flex-direction: column; align-items: stretch; gap: 14px; padding: 16px 16px 16px 20px }
  .request-actions .kg-btn { flex: 1 }
}
</style>
