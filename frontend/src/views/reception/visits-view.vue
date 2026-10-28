<!-- Visitas de recepción: las de hoy y el calendario, con alta, fichas y firma. Se refresca cada minuto (Odoo no avisa
     de lo que entra por el kiosco) y al momento cuando otro puesto del portal cambia algo -->
<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { sessionStore, useNotificationStore, useSocketStore } from '@/store'
import { visitsApi } from '@/model/visits'
import { can } from '@/utils/permissions'
import { madridToday } from '@/utils/visits'
import VisitsToday from '@/components/reception/visits-today.vue'
import VisitsCalendar from '@/components/reception/visits-calendar.vue'
import VisitNewDialog from '@/components/reception/visit-new-dialog.vue'
import VisitDetailDialog from '@/components/reception/visit-detail-dialog.vue'
import VisitSignatureDialog from '@/components/reception/visit-signature-dialog.vue'
import VisitEmailDialog from '@/components/reception/visit-email-dialog.vue'

const TICK_MS = 30 * 1000
const REFRESH_MS = 60 * 1000

const session = sessionStore()
const socketStore = useSocketStore()
const notification = useNotificationStore()
const canManage = computed(() => can(session.auth.user, 'visits.manage'))

const view = ref('today')
const options = ref(null)
const hosts = ref([])
const visitTo = ref(null)
const now = ref(Date.now())
const visits = ref([])
const loading = ref(false)
const month = ref(madridToday().slice(0, 7))
const day = ref(madridToday())
const calendar = ref([])
const calendarLoading = ref(false)

const dialogs = reactive({ create: false, detail: false, signature: false, email: false })
const detailId = ref(null)
const detailVersion = ref(0)
const target = reactive({ person: null, visit: null })
const newDialog = ref(null)

const loadVisits = async () => {
  loading.value = true
  const list = await visitsApi.list(visitTo.value)
  if (list) visits.value = list
  loading.value = false
}
const loadCalendar = async () => {
  calendarLoading.value = true
  const [y, m] = month.value.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  calendar.value = (await visitsApi.calendar(`${month.value}-01`, `${month.value}-${String(last).padStart(2, '0')}`, visitTo.value)) || []
  calendarLoading.value = false
}
const reloadAll = () => {
  detailVersion.value++
  return Promise.all([loadVisits(), view.value === 'calendar' ? loadCalendar() : null])
}

const openCalendar = () => { view.value = 'calendar'; loadCalendar() }
const changeMonth = value => { month.value = value; day.value = value === madridToday().slice(0, 7) ? madridToday() : `${value}-01`; loadCalendar() }
const changeCompany = value => { visitTo.value = value; reloadAll() }

// Hecho en Odoo: se confirma y se recarga
const afterWrite = async (result, okText) => {
  if (!result) return
  notification.notifySuccess(okText)
  await reloadAll()
}

const VISIT_TEXTS = { 'check-in': 'Entrada registrada', 'check-out': 'Salida registrada', cancel: 'Visita cancelada', notify: 'Aviso enviado al anfitrión' }
const PERSON_TEXTS = { 'check-in': 'Entrada registrada', 'check-out': 'Salida registrada', cancel: 'Visitante cancelado', notify: 'Aviso enviado al anfitrión' }

const onVisit = async (action, visit) => afterWrite(await visitsApi.visitAction(visit.id, action), VISIT_TEXTS[action])
const onPerson = async (action, visit, person) => {
  if (action === 'signature' || action === 'email') { Object.assign(target, { person, visit }); dialogs[action] = true; return }
  if (action === 'resend') return afterWrite(await visitsApi.resendSignature(person.id), 'Correo de firma reenviado')
  afterWrite(await visitsApi.visitorAction(person.id, action), PERSON_TEXTS[action])
}
const saveEmail = async email => { dialogs.email = false; afterWrite(await visitsApi.completeVisitor(target.person.id, { email }), 'Email guardado') }
const openDetail = visit => { detailId.value = visit.id; dialogs.detail = true }
const openNew = () => { newDialog.value?.reset(); dialogs.create = true }

// Recarga periódica sin interrumpir a quien tiene un diálogo abierto; los cambios de otros puestos llegan por socket
const anyDialog = () => Object.values(dialogs).some(Boolean)
let tick = null
let refresh = null
let offChanged = null
onMounted(async () => {
  tick = setInterval(() => { now.value = Date.now() }, TICK_MS)
  refresh = setInterval(() => { if (view.value === 'today' && !anyDialog()) loadVisits() }, REFRESH_MS)
  offChanged = socketStore.on('visits:changed', ({ by } = {}) => { if (by !== session.auth.user?.uuid) reloadAll() })
  await Promise.all([visitsApi.options().then(o => { options.value = o }), visitsApi.hosts().then(h => { hosts.value = h || [] }), loadVisits()])
})
onBeforeUnmount(() => { clearInterval(tick); clearInterval(refresh); offChanged?.() })

const todayText = computed(() => {
  const t = new Date(now.value).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' })
  return t.charAt(0).toUpperCase() + t.slice(1)
})
const activeVisits = computed(() => visits.value.filter(v => v.status !== 'canceled').length)
const companies = computed(() => (options.value?.visit_to || []).map(([value, title]) => ({ value, title })))
</script>

<template>
  <div class="visits">
    <header class="visits-head">
      <div>
        <span class="eyebrow">Recepción</span>
        <h1>{{ view === 'today' ? 'Visitas de hoy' : 'Calendario de visitas' }}</h1>
        <p>
          <span class="live" :class="{ on: socketStore.connected }" :title="socketStore.connected ? 'Tiempo real conectado' : 'Sin tiempo real: se actualiza cada minuto'" />
          <template v-if="view === 'today'">{{ todayText }} · {{ activeVisits }} visita{{ activeVisits === 1 ? '' : 's' }}</template>
          <template v-else>Pasadas y futuras, con sus visitantes y la firma de cada uno</template>
        </p>
      </div>
      <div class="tools">
        <v-select :model-value="visitTo" autocomplete="off" :items="companies" placeholder="Todas las empresas" density="compact" hide-details clearable class="company" @update:model-value="changeCompany" />
        <v-btn v-if="view === 'today'" variant="outlined" class="kg-btn kg-btn-ghost" prepend-icon="fa-solid fa-rotate" :loading="loading" @click="loadVisits">Actualizar</v-btn>
        <v-btn v-if="view === 'today'" variant="outlined" class="kg-btn kg-btn-ghost" prepend-icon="fa-regular fa-calendar" @click="openCalendar">Calendario</v-btn>
        <v-btn v-else variant="outlined" class="kg-btn kg-btn-ghost" prepend-icon="fa-solid fa-arrow-left" @click="view = 'today'">Visitas de hoy</v-btn>
        <v-btn v-if="canManage" color="primary" variant="flat" class="kg-btn" prepend-icon="fa-solid fa-plus" @click="openNew">Nueva visita</v-btn>
      </div>
    </header>

    <VisitsToday v-if="view === 'today'" :visits="visits" :options="options" :now="now" :loading="loading" :can-manage="canManage" @detail="openDetail" @visit="onVisit" @person="onPerson" />
    <VisitsCalendar v-else :visits="calendar" :month="month" :day="day" :options="options" :now="now" :loading="calendarLoading" @month="changeMonth" @day="d => (day = d)" @open="openDetail" />

    <VisitNewDialog ref="newDialog" v-model="dialogs.create" :options="options" :hosts="hosts" @saved="reloadAll" />
    <VisitDetailDialog v-model="dialogs.detail" :visit-id="detailId" :version="detailVersion" :options="options" :now="now" :can-manage="canManage" @visit="onVisit" @person="onPerson" />
    <VisitSignatureDialog v-model="dialogs.signature" :person="target.person" :visit-name="target.visit?.name || ''" />
    <VisitEmailDialog v-model="dialogs.email" :person="target.person" :visit="target.visit" @save="saveEmail" />
  </div>
</template>

<style scoped>
.visits { max-width: 1440px; margin: 0 auto; padding: 32px 24px 48px; color: #111111 }
.visits-head { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 18px }
.eyebrow { display: block; margin-bottom: 4px; font-size: .72rem; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: #468131 }
.visits-head h1 { margin: 0; font-size: 1.6rem; font-weight: 600; letter-spacing: -0.01em }
.visits-head p { display: flex; align-items: center; gap: 8px; margin: 4px 0 0; font-size: .9rem; color: #64748b }
.live { width: 8px; height: 8px; border-radius: 50%; background: #cbd5e1 }
.live.on { background: #5bb133; box-shadow: 0 0 0 3px #eef4ea }
.tools { display: flex; flex-wrap: wrap; align-items: center; gap: 8px }
.company { width: 210px }
.company :deep(.v-field) { border-radius: 10px; background: #ffffff }

@media (width < 760px) {
  .visits { padding: 20px 16px 32px }
  .visits-head h1 { font-size: 1.3rem }
  .tools { width: 100% }
  .company { width: 100% }
  .tools .kg-btn { flex: 1 1 calc(50% - 4px) }
}
</style>
