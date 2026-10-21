import { ref, onUnmounted } from 'vue'

// Fechas YYYY-MM-DD siempre en hora local: toISOString pasa a UTC y en España puede cambiar el día
const pad = n => String(n).padStart(2, '0')

export const parseDateKey = key => { const [y, m, d] = String(key).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d) }

// Acepta Date, YYYY-MM-DD o ISO completas (las fechas de la API son medianoche UTC)
export const toDateKey = value => {
  if (!value) return ''
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const d = value instanceof Date ? value : new Date(value)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const todayKey = () => toDateKey(new Date())

// «Hoy» reactivo: se revisa cada minuto para que el calendario abierto pase de día a medianoche
export const useToday = () => {
  const today = ref(todayKey())
  const timer = setInterval(() => { if (today.value !== todayKey()) today.value = todayKey() }, 60000)
  onUnmounted(() => clearInterval(timer))
  return today
}
