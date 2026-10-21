<!-- Barra de herramientas del calendario: navegación de semanas, semana visible y acciones -->
<script setup>
import { computed } from 'vue'
import moment from 'moment/min/moment-with-locales'
import { useToday } from '@/utils/dates'

moment.locale('es')

const props = defineProps({ selectedDate: Object, filtersOpen: Boolean })
defineEmits(['previous', 'next', 'today', 'create', 'toggle-filters'])

const start = computed(() => moment(props.selectedDate).startOf('week'))
const end = computed(() => moment(props.selectedDate).endOf('week'))

const title = computed(() => {
  const [from, to] = [start.value.format('MMMM'), end.value.format('MMMM')]
  return from === to ? `${from} ${end.value.format('YYYY')}` : `${from} – ${to} ${end.value.format('YYYY')}`
})

const range = computed(() => start.value.month() === end.value.month()
  ? `${start.value.format('D')} – ${end.value.format('D MMM')}`
  : `${start.value.format('D MMM')} – ${end.value.format('D MMM')}`)

const today = useToday()
const isCurrentWeek = computed(() => moment(today.value).isBetween(start.value, end.value, 'day', '[]'))
</script>

<template>
  <header class="cal-toolbar">
    <div class="cal-nav">
      <button type="button" class="cal-today" :disabled="isCurrentWeek" @click="$emit('today')">Hoy</button>
      <button type="button" class="cal-arrow" aria-label="Semana anterior" @click="$emit('previous')"><i class="fa-solid fa-chevron-left" /></button>
      <button type="button" class="cal-arrow" aria-label="Semana siguiente" @click="$emit('next')"><i class="fa-solid fa-chevron-right" /></button>
    </div>

    <h1 class="cal-title">{{ title }}</h1>
    <span class="cal-range">{{ range }}</span>

    <div class="cal-actions">
      <button type="button" class="cal-filters" :class="{ active: filtersOpen }" @click="$emit('toggle-filters')"><i class="fa-solid fa-sliders" /> Filtros</button>
      <v-btn color="#111111" variant="flat" class="cal-create" prepend-icon="fa-solid fa-plus" @click="$emit('create')">Nueva reserva</v-btn>
    </div>
  </header>
</template>

<style scoped>
.cal-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 16px }

.cal-nav { display: flex; align-items: center; gap: 4px }
.cal-nav button { display: grid; place-items: center; height: 36px; border: 0; background: transparent; color: #334155; font: inherit; cursor: pointer; transition: background-color .15s, color .15s }
.cal-nav .cal-today { padding: 0 14px; margin-right: 4px; border: 1px solid #e5e7eb; border-radius: 9px; background: #ffffff; font-size: .85rem; font-weight: 600 }
.cal-nav .cal-today:hover:not(:disabled) { border-color: #cbd5e1; color: #111111 }
.cal-nav .cal-today:disabled { color: #94a3b8; cursor: default }
.cal-nav .cal-arrow { width: 32px; border-radius: 50%; font-size: .75rem }
.cal-nav .cal-arrow:hover { background: #e9ebef; color: #111111 }

.cal-title { margin: 0; font-size: 1.35rem; font-weight: 600; letter-spacing: -0.01em; color: #111111; text-transform: capitalize; white-space: nowrap }
.cal-range { font-size: .85rem; color: #64748b; white-space: nowrap }

.cal-actions { display: flex; align-items: center; gap: 10px; margin-left: auto }

.cal-filters { display: none; align-items: center; gap: 8px; height: 36px; padding: 0 14px; border: 1px solid #e5e7eb; border-radius: 9px; background: #ffffff; color: #334155; font: inherit; font-size: .85rem; font-weight: 600; cursor: pointer }
.cal-filters.active { border-color: #111111; color: #111111 }

.cal-create { height: 36px !important; border-radius: 9px; font-size: .85rem; font-weight: 600; letter-spacing: 0 }

@media (width < 1100px) {
  .cal-filters { display: inline-flex }
}

@media (width < 600px) {
  .cal-title { font-size: 1.15rem }
  .cal-range { display: none }
  .cal-actions { width: 100%; margin-left: 0 }
  .cal-create { flex: 1 }
}
</style>
