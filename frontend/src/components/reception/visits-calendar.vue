<!-- Calendario de visitas pasadas y futuras (incluidas canceladas): filtros, resumen del mes, días con sus visitas
     y la agenda del día elegido -->
<script setup>
import { computed, reactive } from 'vue'
import VisitTag from './visit-tag.vue'
import { STATES, STATE_COLORS, STATE_LABELS, STATE_TONES, companyName, humanDuration, labelOf, longDay, msTime, odooDay, odooMs, odooTime, visitKey, visitState, visitTitle } from '@/utils/visits'

const props = defineProps({
  visits: { type: Array, default: () => [] },
  month: { type: String, required: true },
  day: { type: String, required: true },
  options: { type: Object, default: null },
  now: { type: Number, required: true },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['month', 'day', 'open'])

const filters = reactive({ q: '', type: null, visitTo: null, host: null, state: null })
const select = list => (list || []).map(([value, title]) => ({ value, title }))
const hostOptions = computed(() => [...new Map(props.visits.flatMap(v => v.hosts).map(h => [h.id, h])).values()].sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(h => ({ value: h.id, title: h.name || h.id })))
const stateOptions = STATES.map(value => ({ value, title: STATE_LABELS[value] }))

const passes = visit => {
  const q = filters.q?.trim().toLowerCase()
  const text = `${companyName(visit) ?? ''} ${visit.reason_label ?? ''} ${visit.persons.map(p => p.name).join(' ')}`.toLowerCase()
  return (!filters.type || visit.type === filters.type) && (!filters.visitTo || visit.visit_to === filters.visitTo) &&
    (!filters.host || visit.hosts.some(h => h.id === filters.host)) && (!filters.state || visitState(visit, props.now) === filters.state) && (!q || text.includes(q))
}
const list = computed(() => props.visits.filter(passes))
const byDay = computed(() => {
  const days = {}
  for (const v of list.value) (days[odooDay(v.date)] ??= []).push(v)
  return days
})

// Rejilla del mes empezando en lunes
const grid = computed(() => {
  const [y, m] = props.month.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const lead = (first.getDay() + 6) % 7
  const total = new Date(y, m, 0).getDate()
  const pad = n => String(n).padStart(2, '0')
  return [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => `${props.month}-${pad(i + 1)}`)]
})
const monthTitle = computed(() => { const [y, m] = props.month.split('-').map(Number); const t = new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }); return t.charAt(0).toUpperCase() + t.slice(1) })
const shift = delta => { const [y, m] = props.month.split('-').map(Number); const d = new Date(y, m - 1 + delta, 1); emit('month', `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`) }
const today = computed(() => new Date(props.now).toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' }))

// Resumen del mes con los filtros aplicados
const stats = computed(() => {
  const visits = list.value
  const done = visits.filter(v => ['checked_in', 'checked_out'].includes(v.status))
  const peopleDone = done.flatMap(v => v.persons.filter(p => ['checked_in', 'checked_out'].includes(p.state)))
  const closed = peopleDone.filter(p => p.check_out)
  const failed = visits.filter(v => ['no_show', 'canceled'].includes(visitState(v, props.now)))
  return [
    { title: 'Visitas del mes', value: visits.length, note: `${visits.reduce((n, v) => n + v.persons.length, 0)} visitantes · ${visits.filter(v => visitState(v, props.now) === 'planned').length} por venir` },
    { title: 'Realizadas', value: done.length, note: closed.length ? `Estancia media ${humanDuration(closed.reduce((s, p) => s + odooMs(p.check_out) - odooMs(p.check_in), 0) / closed.length)}` : 'Sin salidas registradas' },
    { title: 'Registro firmado', value: peopleDone.length ? `${Math.round(peopleDone.filter(p => p.signature === 'signed').length / peopleDone.length * 100)}%` : '–', note: `${peopleDone.filter(p => p.signature !== 'signed').length} visitantes sin firma` },
    { title: 'No presentadas o canceladas', value: failed.length, note: `${failed.filter(v => visitState(v, props.now) === 'canceled').length} canceladas` },
  ]
})
const bars = (field, labels) => {
  const counts = {}
  for (const v of list.value) if (v[field]) counts[v[field]] = (counts[v[field]] ?? 0) + 1
  const max = Math.max(1, ...Object.values(counts))
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([key, n]) => ({ key, label: labelOf(labels, key) || key, n, pct: n / max * 100 }))
}

const agenda = computed(() => byDay.value[props.day] ?? [])
const agendaNote = computed(() => {
  if (!agenda.value.length) return 'Sin visitas este día con los filtros actuales.'
  const when = props.day < today.value ? 'día pasado' : props.day === today.value ? 'hoy' : 'previstas'
  return `${agenda.value.length} visita${agenda.value.length > 1 ? 's' : ''} · ${when}`
})
// Franja real si ya llegaron (primera entrada y última salida); si no, la hora prevista
const came = v => v.persons.filter(p => ['checked_in', 'checked_out'].includes(p.state))
const firstEntry = v => came(v).length ? msTime(Math.min(...came(v).map(p => odooMs(p.check_in)))) : odooTime(v.date)
const lastExit = v => Math.max(0, ...v.persons.map(p => odooMs(p.check_out) ?? 0))
</script>

<template>
  <div class="cal">
    <div class="cal-filters kg-form">
      <v-text-field v-model="filters.q" autocomplete="off" placeholder="Empresa, visitante o motivo" prepend-inner-icon="fa-solid fa-magnifying-glass" density="compact" hide-details clearable class="f-search" />
      <v-select v-model="filters.type" autocomplete="off" :items="select(options?.types)" placeholder="Todos los tipos" density="compact" hide-details clearable />
      <v-select v-model="filters.visitTo" autocomplete="off" :items="select(options?.visit_to)" placeholder="Todas las empresas" density="compact" hide-details clearable />
      <v-select v-model="filters.host" autocomplete="off" :items="hostOptions" placeholder="Todos los anfitriones" density="compact" hide-details clearable />
      <v-select v-model="filters.state" autocomplete="off" :items="stateOptions" placeholder="Todos los estados" density="compact" hide-details clearable />
    </div>

    <div class="kpis">
      <div v-for="k in stats" :key="k.title" class="kpi">
        <span class="kpi-title">{{ k.title }}</span>
        <strong>{{ loading ? '…' : k.value }}</strong>
        <small>{{ k.note }}</small>
      </div>
    </div>

    <div class="layout">
      <section class="month">
        <header class="month-head">
          <button type="button" class="kg-icon-btn" aria-label="Mes anterior" @click="shift(-1)"><i class="fa-solid fa-chevron-left" /></button>
          <strong>{{ monthTitle }}</strong>
          <button type="button" class="kg-icon-btn" aria-label="Mes siguiente" @click="shift(1)"><i class="fa-solid fa-chevron-right" /></button>
          <v-progress-circular v-if="loading" indeterminate size="16" width="2" color="primary" class="ms-2" />
        </header>
        <div class="weekdays"><span v-for="d in ['L', 'M', 'X', 'J', 'V', 'S', 'D']" :key="d">{{ d }}</span></div>
        <div class="days">
          <template v-for="(key, i) in grid" :key="key || `e${i}`">
            <span v-if="!key" />
            <button v-else type="button" class="day" :class="{ selected: key === day, today: key === today, has: byDay[key] }" @click="emit('day', key)">
              <span class="num">{{ Number(key.slice(8)) }}</span>
              <span class="dots">
                <i v-for="v in (byDay[key] || []).slice(0, 4)" :key="visitKey(v)" :style="{ background: STATE_COLORS[visitState(v, now)] }" />
              </span>
              <span v-if="(byDay[key] || []).length > 4" class="more">+{{ byDay[key].length - 4 }}</span>
            </button>
          </template>
        </div>
        <div class="legend"><span v-for="s in STATES" :key="s"><i :style="{ background: STATE_COLORS[s] }" />{{ STATE_LABELS[s] }}</span></div>

        <div class="bars">
          <div v-for="b in [{ title: 'Por motivo', items: bars('reason', options?.reasons) }, { title: 'Por empresa visitada', items: bars('visit_to', options?.visit_to) }]" :key="b.title">
            <strong>{{ b.title }}</strong>
            <p v-if="!b.items.length" class="muted">–</p>
            <div v-for="row in b.items" :key="row.key" class="bar"><span>{{ row.label }}</span><div class="track"><div :style="{ width: `${row.pct}%` }" /></div><b>{{ row.n }}</b></div>
          </div>
        </div>
      </section>

      <aside class="agenda">
        <header><strong>{{ longDay(day) }}</strong><small>{{ agendaNote }}</small></header>
        <article v-for="v in agenda" :key="visitKey(v)" class="entry" :style="{ borderLeftColor: STATE_COLORS[visitState(v, now)] }">
          <div class="entry-top"><strong>{{ firstEntry(v) }}{{ lastExit(v) ? `–${msTime(lastExit(v))}` : '' }}</strong><VisitTag :text="STATE_LABELS[visitState(v, now)]" :tone="STATE_TONES[visitState(v, now)]" /></div>
          <div class="entry-title">{{ visitTitle(v) }} <VisitTag v-if="v.type" :text="labelOf(options?.types, v.type) || v.type" /></div>
          <small>{{ v.persons.map(p => p.name + (p.registered ? '' : ' (no registrado)')).join(', ') }}</small>
          <small>{{ v.visit_to ? `Visita a ${labelOf(options?.visit_to, v.visit_to) || v.visit_to} · ` : '' }}{{ v.reason_label || '' }}{{ v.hosts.length ? ` · con ${v.hosts.map(h => h.name).join(', ')}` : '' }}</small>
          <small>{{ v.persons.filter(p => p.signature === 'signed').length }}/{{ v.persons.length }} firmados{{ v.factory ? ' · Fábrica · EPIs' : '' }}</small>
          <button v-if="!v.loose" type="button" class="act" @click="emit('open', v)">Ver ficha completa</button>
        </article>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.cal-filters { display: grid; grid-template-columns: 2fr repeat(4, 1fr); gap: 8px; margin-bottom: 14px }
.cal-filters :deep(.v-field) { background: #ffffff }

.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px }
.kpi { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border: 1px solid #eceef2; border-radius: 12px; background: #ffffff }
.kpi-title { font-size: .72rem; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #94a3b8 }
.kpi strong { font-size: 1.4rem }
.kpi small { font-size: .78rem; color: #64748b }

.layout { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 14px; align-items: start }
.month, .agenda { padding: 14px 16px; border: 1px solid #eceef2; border-radius: 14px; background: #ffffff }
.month-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px }
.month-head strong { min-width: 150px; text-align: center }
.weekdays, .days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px }
.weekdays span { padding: 4px 0; font-size: .7rem; font-weight: 600; color: #94a3b8; text-align: center }
.day { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; min-height: 52px; padding: 6px 2px; border: 1px solid transparent; border-radius: 10px; background: #fbfbfc; font: inherit; cursor: pointer }
.day:hover { border-color: #e5e7eb }
.day.today .num { color: #468131; font-weight: 700 }
.day.selected { border-color: #111111; background: #ffffff }
.num { font-size: .85rem }
.dots { display: flex; gap: 3px }
.dots i { width: 7px; height: 7px; border-radius: 50% }
.more { font-size: .65rem; color: #64748b }
.legend { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; font-size: .75rem; color: #64748b }
.legend i { display: inline-block; width: 8px; height: 8px; margin-right: 4px; border-radius: 50% }

.bars { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #f1f2f4 }
.bars strong { font-size: .82rem }
.bar { display: grid; grid-template-columns: 45% 1fr 24px; align-items: center; gap: 8px; margin-top: 4px; font-size: .78rem }
.bar span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
.track { height: 6px; border-radius: 3px; background: #f1f2f4 }
.track div { height: 100%; border-radius: 3px; background: #5bb133 }
.bar b { text-align: right }
.muted { color: #94a3b8; font-size: .8rem }

.agenda header { display: flex; flex-direction: column; margin-bottom: 10px }
.agenda header small { color: #64748b; font-size: .8rem }
.entry { display: flex; flex-direction: column; gap: 3px; margin-bottom: 8px; padding: 10px 12px; border: 1px solid #eceef2; border-left: 4px solid; border-radius: 10px }
.entry-top { display: flex; justify-content: space-between; align-items: center; gap: 8px }
.entry-title { font-weight: 600; font-size: .9rem }
.entry small { color: #64748b; font-size: .78rem }
.act { align-self: flex-start; height: 28px; margin-top: 4px; padding: 0 10px; border: 1px solid #d1d5db; border-radius: 8px; background: #ffffff; color: #334155; font: inherit; font-size: .78rem; font-weight: 600; cursor: pointer }

@media (width < 1000px) {
  .cal-filters { grid-template-columns: 1fr 1fr }
  .f-search { grid-column: 1 / -1 }
  .kpis { grid-template-columns: 1fr 1fr }
  .layout { grid-template-columns: 1fr }
}
@media (width < 600px) { .bars { grid-template-columns: 1fr } }
</style>
