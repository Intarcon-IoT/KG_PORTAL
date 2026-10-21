<template>
  <appDialog v-model="isVisible" title="¿Aprobar la reserva?" icon="fa-solid fa-triangle-exclamation" tone="warning" :width="440" @close="emit('cancel')">
    <p class="kg-note">Vas a aprobar la reserva de <strong>{{ booking?.name || 'este usuario' }}</strong>.</p>
    <div class="kg-summary">
      <span class="kg-summary-title">{{ booking?.title }}</span>
      <dl>
        <div><dt>Fecha</dt><dd>{{ formattedDate }}</dd></div>
        <div><dt>Hora</dt><dd>{{ booking?.start_time?.substring(0, 5) }} – {{ booking?.end_time?.substring(0, 5) }}</dd></div>
        <div v-if="facility"><dt>Sede</dt><dd>{{ facility.name }}</dd></div>
        <div v-if="room"><dt>Sala</dt><dd>{{ room.name }}</dd></div>
      </dl>
    </div>
    <p class="kg-note warn"><i class="fa-solid fa-circle-info" /> Las reservas pendientes que se solapen con esta se rechazarán automáticamente.</p>

    <template #actions>
      <v-btn variant="outlined" class="kg-btn kg-btn-ghost" @click="emit('cancel')">Cancelar</v-btn>
      <v-btn color="primary" variant="flat" class="kg-btn" @click="emit('confirm')">Aprobar</v-btn>
    </template>
  </appDialog>
</template>

<script setup>
import appDialog from '@/components/app-dialog.vue'
import { computed } from 'vue';

const props = defineProps({
  modelValue: Boolean,
  booking: Object,
  room: Object,
  facility: Object
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const isVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const formattedDate = computed(() => {
  if (!props.booking?.start_date) return '';
  const date = new Date(props.booking.start_date);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
});
</script>

<style scoped>
.warn { color: #b45309; font-size: .825rem }
.warn i { margin-right: 4px }
</style>
