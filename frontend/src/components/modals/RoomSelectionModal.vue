<template>
  <appDialog v-model="internalDialog" eyebrow="Nueva reserva · Paso 2 de 4" title="Elige la sala" :width="480" back @back="goBack">
    <div class="options">
      <button v-for="room in rooms" :key="room.uuid" type="button" class="option" @click="selectRoom(room)">
        <span class="option-name">{{ room.name }}</span>
        <span class="option-meta">
          <span v-if="room.needsValidation" class="tag-approval">
            <i class="fa-solid fa-shield-halved" /> Con aprobación
            <v-tooltip activator="parent" location="top">Las reservas en esta sala debe aprobarlas un administrador</v-tooltip>
          </span>
          <span><i class="fa-solid fa-user-group" /> {{ room.capacity }}</span>
        </span>
        <i class="fa-solid fa-chevron-right option-chevron" />
      </button>
      <p v-if="!rooms?.length" class="empty">Esta sede no tiene salas.</p>
    </div>
  </appDialog>
</template>

<script setup>
import appDialog from '@/components/app-dialog.vue'
import { ref, watch } from 'vue'

const props = defineProps({
  dialog: Boolean,
  rooms: Array
})

const emit = defineEmits(['update:dialog', 'next', 'back'])

const internalDialog = ref(props.dialog)

watch(() => props.dialog, (val) => {
  internalDialog.value = val
})

watch(internalDialog, (val) => {
  emit('update:dialog', val)
})

function selectRoom(room) {
  emit('update:dialog', false)
  emit('next', room)
}

function goBack() {
  emit('update:dialog', false)
  emit('back')
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
.option-meta i { margin-right: 3px; font-size: .7rem }
.tag-approval { color: #b45309 }
</style>
