<template>
  <appDialog v-model="internalDialog" eyebrow="Nueva reserva · Paso 1 de 4" title="Elige la sede" :width="480">
    <div class="options">
      <button v-for="facility in installations" :key="facility.uuid" type="button" class="option" @click="selectFacility(facility)">
        <span class="dot" :style="{ background: facility.color }" />
        <span class="option-name">{{ facility.name }}</span>
        <i class="fa-solid fa-chevron-right option-chevron" />
      </button>
      <p v-if="!installations?.length" class="empty">No hay sedes disponibles.</p>
    </div>
  </appDialog>
</template>

<script setup>
import appDialog from '@/components/app-dialog.vue'
import { ref, watch } from 'vue'

const props = defineProps({
  dialog: Boolean,
  installations: Array
})

const emit = defineEmits(['update:dialog', 'next'])

const internalDialog = ref(props.dialog)

watch(() => props.dialog, (val) => {
  internalDialog.value = val
})

watch(internalDialog, (val) => {
  emit('update:dialog', val)
})

function selectFacility(facility) {
  emit('next', facility)
  emit('update:dialog', false)
}
</script>

<style scoped>
.options { display: flex; flex-direction: column; gap: 8px }
.option { display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 16px; border: 1px solid #eceef2; border-radius: 12px; background: #ffffff; color: #111111; font: inherit; text-align: left; cursor: pointer; transition: border-color .15s, background-color .15s }
.option:hover { border-color: #cbd5e1; background: #f8f9fa }
.option:focus-visible { outline: 2px solid #111111; outline-offset: 2px }
.option-name { flex: 1; min-width: 0; font-weight: 600 }
.option-meta { display: flex; align-items: center; gap: 10px; font-size: .8rem; color: #64748b; white-space: nowrap }
.option-chevron { font-size: .7rem; color: #94a3b8 }
.empty { margin: 8px 0; color: #64748b; font-size: .9rem }
.dot { width: 10px; height: 10px; flex-shrink: 0; border-radius: 3px }
</style>
