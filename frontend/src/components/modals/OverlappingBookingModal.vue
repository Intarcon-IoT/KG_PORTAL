<template>
  <v-dialog v-model="isVisible" max-width="400" transition="dialog-bottom-transition">
    <v-card class="confirm-dialog rounded-lg overflow-visible">
      
      <div class="confirm-header">
        <v-avatar color="orange" size="60" class="elevation-4 avatar-overlap">
          <i class="fa-solid fa-triangle-exclamation fa-xl text-white"></i>
        </v-avatar>
      </div>

      <v-card-title class="text-h5 text-center pt-8 pb-0 font-weight-bold">
        Confirmar aprobación
      </v-card-title>

      <v-card-text class="text-center pt-4 pb-0">
        <p class="mb-3 text-body-1">
          ¿Está seguro de validar la reserva de <strong>{{ booking?.name || 'el usuario' }}</strong>?
        </p>

        <div class="booking-info-box">
          <div class="booking-info-title mb-3">
            <i class="fa-solid fa-calendar-check mr-2 text-primary"></i>
            {{ booking?.title }}
          </div>
          <div class="booking-info-details">
            <div class="info-row">
              <span class="info-label">Usuario:</span>
              <span class="info-value">{{ booking?.name || 'N/A' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Fecha:</span>
              <span class="info-value">{{ formattedDate }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Hora:</span>
              <span class="info-value">{{ booking?.start_time?.substring(0,5) }} - {{ booking?.end_time?.substring(0,5) }}</span>
            </div>
            <div class="info-row" v-if="facility">
              <span class="info-label">Edificio:</span>
              <span class="info-value">{{ facility.name }}</span>
            </div>
            <div class="info-row" v-if="room">
              <span class="info-label">Sala:</span>
              <span class="info-value">{{ room.name }}</span>
            </div>
          </div>
        </div>

        <p class="text-caption text-error mt-4 mb-0 font-weight-medium">
          <i class="fa-solid fa-circle-info mr-1"></i>
          Al aprobar esta reserva, las demás solapadas se rechazarán automáticamente.
        </p>
      </v-card-text>

      <v-card-actions class="pb-6 pt-5 px-6 justify-center">
        <v-btn color="grey-darken-1" variant="outlined" class="mx-2 text-none" min-width="120" @click="$emit('cancel')">
          Cancelar
        </v-btn>
        <v-btn color="success" variant="elevated" min-width="120" class="mx-2 text-none" @click="$emit('confirm')">
          Confirmar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
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
.confirm-dialog {
  overflow: visible !important;
  margin-top: 30px;
}

.confirm-header {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}

.avatar-overlap {
  border: 4px solid white;
}

.booking-info-box {
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 16px;
  margin-top: 12px;
  background-color: #fcfcfc;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
}

.booking-info-title {
  font-weight: 700;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.booking-info-details .info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  border-bottom: 1px dashed #eee;
  padding-bottom: 4px;
}

.booking-info-details .info-row:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.info-label {
  font-weight: 500;
  color: #757575;
}

.info-value {
  font-weight: 600;
  color: #212121;
}

.text-none {
  text-transform: none !important;
}
</style>
