<!-- Filtro de sedes visibles en el calendario; la selección se guarda en useConfigStore -->
<script setup>
import { computed, watch } from 'vue'
import { useConfigStore } from '@/store'

const props = defineProps({ installationsList: Array })
const emit = defineEmits(['update:selectedFacilitiesUuid'])
const { filters } = useConfigStore()

// Descarta sedes guardadas que ya no existen; si no queda ninguna de ellas, se marcan todas
const known = props.installationsList.map(f => f.uuid)
if (!Array.isArray(filters.selectedFacilities)) filters.selectedFacilities = known
else if (filters.selectedFacilities.length) {
  const valid = filters.selectedFacilities.filter(uuid => known.includes(uuid))
  filters.selectedFacilities = valid.length ? valid : known
}

const allSelected = computed(() => filters.selectedFacilities.length === props.installationsList.length)
const toggleAll = () => { filters.selectedFacilities = allSelected.value ? [] : props.installationsList.map(f => f.uuid) }

watch(() => filters.selectedFacilities, value => emit('update:selectedFacilitiesUuid', value), { immediate: true })
</script>

<template>
  <div class="filter">
    <div class="filter-head">
      <span class="filter-title">Sedes</span>
      <button type="button" class="filter-all" @click="toggleAll">{{ allSelected ? 'Ninguna' : 'Todas' }}</button>
    </div>

    <label v-for="facility in installationsList" :key="facility.uuid" class="option" :style="{ '--c': facility.color }">
      <input v-model="filters.selectedFacilities" type="checkbox" :value="facility.uuid" />
      <span class="check"><i class="fa-solid fa-check" /></span>
      <span class="option-name">{{ facility.name }}</span>
    </label>
  </div>
</template>

<style scoped>
.filter-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px }
.filter-title { font-size: .72rem; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: #94a3b8 }
.filter-all { padding: 2px 6px; border: 0; border-radius: 6px; background: transparent; color: #111111; font: inherit; font-size: .78rem; font-weight: 600; cursor: pointer }
.filter-all:hover { background: #f4f5f7 }

.option { position: relative; display: flex; align-items: center; gap: 10px; padding: 7px 8px; margin: 0 -8px; border-radius: 8px; color: #334155; font-size: .85rem; cursor: pointer; transition: background-color .12s }
.option:hover { background: #f6f7f9 }
.option input { position: absolute; opacity: 0; pointer-events: none }

.check { display: grid; place-items: center; flex-shrink: 0; width: 18px; height: 18px; border: 1.5px solid color-mix(in srgb, var(--c) 60%, #cbd5e1); border-radius: 5px; background: #ffffff; color: #ffffff; font-size: .6rem; transition: background-color .12s, border-color .12s }
.check i { opacity: 0 }
.option input:checked + .check { border-color: var(--c); background: var(--c) }
.option input:checked + .check i { opacity: 1 }
.option input:focus-visible + .check { outline: 2px solid #111111; outline-offset: 2px }
.option-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
</style>
