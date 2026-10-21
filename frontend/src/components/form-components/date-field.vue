<!-- Campo de fecha del portal: muestra la fecha legible y abre un calendario; el valor es 'YYYY-MM-DD' -->
<script setup>
import { computed, ref } from 'vue'
import { parseDateKey, toDateKey, todayKey } from '@/utils/dates'

const props = defineProps({
  min: { type: String, default: undefined },
  max: { type: String, default: undefined },
  placeholder: { type: String, default: 'Selecciona una fecha' },
  disabled: { type: Boolean, default: false },
})

const model = defineModel({ type: String, default: '' })
const menu = ref(false)

const label = computed(() => {
  if (!model.value) return ''
  // El año solo se muestra si no es el actual
  const date = parseDateKey(model.value)
  const year = date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  const text = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year })
  return text.charAt(0).toUpperCase() + text.slice(1)
})

// El calendario trabaja con Date; hacia fuera siempre la clave local
const picked = computed({
  get: () => model.value ? parseDateKey(model.value) : null,
  set: value => { if (value) choose(toDateKey(value)) },
})

const inRange = key => (!props.min || key >= props.min) && (!props.max || key <= props.max)
const shortcuts = computed(() => {
  const tomorrow = parseDateKey(todayKey()); tomorrow.setDate(tomorrow.getDate() + 1)
  return [{ title: 'Hoy', key: todayKey() }, { title: 'Mañana', key: toDateKey(tomorrow) }].filter(s => inRange(s.key))
})

const choose = key => { model.value = key; menu.value = false }
</script>

<template>
  <v-menu v-model="menu" :close-on-content-click="false" :disabled="disabled" location="bottom start" offset="6">
    <template #activator="{ props: activator }">
      <v-text-field
        v-bind="activator" :model-value="label" :placeholder="placeholder" :disabled="disabled" readonly autocomplete="off" hide-details
        append-inner-icon="fa-regular fa-calendar" class="date-field" @keydown.enter.prevent="menu = true" @keydown.space.prevent="menu = true"
      />
    </template>

    <div class="date-menu">
      <div v-if="shortcuts.length" class="date-shortcuts">
        <button v-for="s in shortcuts" :key="s.key" type="button" :class="{ active: s.key === model }" @click="choose(s.key)">{{ s.title }}</button>
      </div>
      <v-date-picker v-model="picked" :min="min" :max="max" hide-header control-variant="modal" color="primary" show-adjacent-months elevation="0" width="300" />
    </div>
  </v-menu>
</template>

<style scoped>
.date-field :deep(input) { cursor: pointer }

.date-menu { overflow: hidden; border: 1px solid #eceef2; border-radius: 14px; background: #ffffff; box-shadow: 0 16px 40px -12px rgba(15, 23, 42, .3) }
.date-shortcuts { display: flex; gap: 6px; padding: 12px 12px 0 }
.date-shortcuts button { padding: 6px 12px; border: 1px solid #e5e7eb; border-radius: 999px; background: #ffffff; color: #334155; font: inherit; font-size: .8rem; font-weight: 600; cursor: pointer }
.date-shortcuts button:hover, .date-shortcuts button.active { border-color: #111111; color: #111111 }
</style>
