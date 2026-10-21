<!-- Calendario mensual compacto: al pulsar un día se muestra su semana -->
<script setup>
import { ref, computed, watch } from 'vue'
import { parseDateKey, useToday } from '@/utils/dates'

const props = defineProps({ selectedDate: Date })
const emit = defineEmits(['dateSelected'])

const startOfDay = date => { const d = new Date(date); d.setHours(0, 0, 0, 0); return d }
const mondayOf = date => { const d = startOfDay(date); const day = d.getDay(); d.setDate(d.getDate() - day + (day === 0 ? -6 : 1)); return d }

const current = ref(new Date(props.selectedDate))
watch(() => props.selectedDate, value => { current.value = new Date(value) })

const year = computed(() => current.value.getFullYear())
const month = computed(() => current.value.getMonth())
const monthName = computed(() => `${current.value.toLocaleDateString('es-ES', { month: 'long' })} ${year.value}`)
const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const shiftMonth = step => { current.value = new Date(year.value, month.value + step, 1) }

// 6 semanas completas empezando en lunes
const todayKey = useToday()
const days = computed(() => {
  const today = parseDateKey(todayKey.value).getTime()
  const selected = startOfDay(props.selectedDate).getTime()
  const monday = mondayOf(props.selectedDate)
  const weekStart = monday.getTime()
  const weekEnd = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6).getTime()
  const first = mondayOf(new Date(year.value, month.value, 1))
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(first)
    date.setDate(first.getDate() + i)
    const time = date.getTime()
    return { date, key: time, number: date.getDate(), outside: date.getMonth() !== month.value, today: time === today, selected: time === selected, inWeek: time >= weekStart && time <= weekEnd }
  })
})
</script>

<template>
  <div class="mini">
    <div class="mini-head">
      <span class="mini-title">{{ monthName }}</span>
      <div class="mini-nav">
        <button type="button" aria-label="Mes anterior" @click="shiftMonth(-1)"><i class="fa-solid fa-chevron-left" /></button>
        <button type="button" aria-label="Mes siguiente" @click="shiftMonth(1)"><i class="fa-solid fa-chevron-right" /></button>
      </div>
    </div>

    <div class="mini-grid">
      <span v-for="day in weekdays" :key="day" class="mini-wd">{{ day }}</span>
      <button
        v-for="day in days"
        :key="day.key"
        type="button"
        class="mini-day"
        :class="{ outside: day.outside, today: day.today, selected: day.selected, 'in-week': day.inWeek }"
        @click="emit('dateSelected', day.date)"
      >
        {{ day.number }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.mini-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px }
.mini-title { font-size: .9rem; font-weight: 600; color: #111111; text-transform: capitalize }
.mini-nav { display: flex; gap: 2px }
.mini-nav button { display: grid; place-items: center; width: 28px; height: 28px; border: 0; border-radius: 8px; background: transparent; color: #64748b; font-size: .7rem; cursor: pointer }
.mini-nav button:hover { background: #f4f5f7; color: #111111 }

.mini-grid { display: grid; grid-template-columns: repeat(7, 1fr); row-gap: 2px; text-align: center }
.mini-wd { padding-bottom: 6px; font-size: .7rem; font-weight: 600; color: #94a3b8 }

.mini-day { height: 32px; border: 0; background: transparent; color: #334155; font: inherit; font-size: .8rem; font-weight: 500; cursor: pointer; transition: background-color .12s }
.mini-day:hover { background: #f1f2f4; border-radius: 8px }
.mini-day.outside { color: #c3c9d2 }
.mini-day.in-week { background: #f1f5ee }
.mini-day.in-week:nth-of-type(7n + 1) { border-radius: 8px 0 0 8px }
.mini-day.in-week:nth-of-type(7n) { border-radius: 0 8px 8px 0 }
.mini-day.today { color: #468131; font-weight: 700 }
.mini-day.selected { border-radius: 8px; background: #111111; color: #ffffff; font-weight: 700 }
</style>
