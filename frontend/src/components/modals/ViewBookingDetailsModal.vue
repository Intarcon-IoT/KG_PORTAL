<template>
  <div>
    <v-dialog v-model="internalDialog" max-width="500" transition="dialog-bottom-transition" persistent>
      <v-card class="pa-6 rounded-xl" style="position: relative;">

        <div class="action-buttons">
          <v-btn v-if="canDeleteBooking && !booking.isReadOnly" class="btn-edit" icon size="small" aria-label="Editar"
            @click="handleEdit">
            <i class="fa-solid fa-pen-to-square"></i>
          </v-btn>
          <v-btn v-if="canDeleteBooking && !booking.isReadOnly" class="btn-delete" icon size="small" aria-label="Borrar"
            @click="confirmDelete">
            <i class="fa-solid fa-trash-can"></i>
          </v-btn>
          <v-btn icon size="small" aria-label="Cerrar" @click="internalDialog = false">
            <i class="fa-solid fa-xmark"></i>
          </v-btn>
        </div>

        <v-card-title class="text-h6 font-weight-bold text-grey-darken-3 pa-0 mb-4">
          <!-- Sección de etiquetas -->
          <div class="mb-2 d-flex gap-2 flex-wrap">
            <v-chip v-if="booking.isReadOnly" size="small" color="error">Evento pasado</v-chip>
          </div>
          <!-- Título de la reserva -->
          <div class="title-container">
            <span class="booking-title">{{ booking.title }}</span>
            <span v-if="wasEdited" class="edited-tag">(Editado)</span>
          </div>
        </v-card-title>

        <v-card-text class="pa-0">
          <div class="info-line mb-2">
            <i class="fa-solid fa-calendar-days mr-3"></i>
            <span v-if="formatedDate == formatedDateTo">{{ formatedDate }} {{ startTime }} - {{ endTime }}</span>
            <span v-else>{{ formatedDate }} - {{ startTime }}<br>{{ formatedDateTo }} - {{ endTime }}</span>
          </div>

          <div class="info-line mb-2">
            <div class="color-box mr-3" :style="{ backgroundColor: `${facilitySelected.color}` }"></div>
            <span>{{ roomSelected.name }}</span>
          </div>

          <div v-if="booking.details" class="info-line mb-2">
            <i class="fa-solid fa-align-left mr-3"></i>
            <span>{{ booking.details }}</span>
          </div>

          <div class="info-line mt-4">
            <i class="fa-solid fa-user mr-3"></i>
            <span>{{ booking.name }}</span>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-dialog v-model="deleteDialog" max-width="400" transition="dialog-bottom-transition">
      <v-card class="delete-dialog rounded-lg">
        <div class="delete-header">
          <v-avatar color="error" size="50" class="elevation-2">
            <i class="fa-solid fa-trash-can fa-lg"></i>
          </v-avatar>
        </div>

        <v-card-title class="text-h5 text-center pt-4 pb-0">¿Eliminar reserva?</v-card-title>

        <v-card-text class="text-center pt-4 pb-0">
          <p class="mb-3">Está a punto de eliminar la siguiente reserva:</p>

          <div class="booking-info-box">
            <div class="booking-info-title">
              <i class="fa-solid fa-calendar-day mr-2"></i>
              {{ booking.title }}
            </div>
            <div class="booking-info-details">
              <div class="info-row">
                <span class="info-label">Fecha:</span>
                <span class="info-value">{{ formatedDate }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Hora:</span>
                <span class="info-value">{{ startTime }} - {{ endTime }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Edificio:</span>
                <span class="info-value">{{ facilitySelected.name }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Sala:</span>
                <span class="info-value">{{ roomSelected.name }}</span>
              </div>
            </div>
          </div>

          <p class="text-caption text-error mt-4 mb-0">Esta acción no se puede deshacer.</p>
        </v-card-text>

        <v-card-actions class="pb-6 pt-3 px-6 justify-center">
          <v-btn color="grey-darken-1" variant="outlined" class="mx-2" min-width="120" @click="deleteDialog = false">
            Cancelar
          </v-btn>
          <v-btn color="error" variant="elevated" min-width="120" class="mx-2" @click="handleDelete">
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>


<script setup>
import { ref, watch, computed } from 'vue'
import { sessionStore } from '@/store';
import moment from 'moment/min/moment-with-locales'
moment.locale('es')

const props = defineProps({
  dialog: Boolean,
  booking: Object,
  rooms: Array,
  facilities: Array,
})

const emit = defineEmits(['update:dialog', 'edit', 'delete'])

const session = sessionStore();
const internalDialog = ref(props.dialog)
const deleteDialog = ref(false)

const handleEdit = () => {
  internalDialog.value = false
  emit('edit', props.booking)
}

const handleDelete = () => {
  deleteDialog.value = false
  internalDialog.value = false
  emit('delete', props.booking.uuid)
}

const confirmDelete = () => {
  deleteDialog.value = true
}

const wasEdited = computed(() => {
  return props.booking && props.booking.updated_ts !== null;
});

const formatedDate = computed(() => {
  return moment(props.booking.start_date).format('dddd, D MMMM YYYY')
})

const formatedDateTo = computed(() => {
  return moment(props.booking.end_date).format('dddd, D MMMM YYYY')
})

const startTime = computed(() => {
  return moment(props.booking.start_time, 'HH:mm').format('HH:mm')
})

const endTime = computed(() => {
  return moment(props.booking.end_time, 'HH:mm').format('HH:mm')
})

const roomSelected = computed(() => {
  return props.rooms.find((room) => room.uuid === props.booking.room_uuid)
})

const facilitySelected = computed(() => {
  return props.facilities.find((facility) => facility.uuid === roomSelected.value.facility_uuid)
})


const canDeleteBooking = computed(() => {
  return session.auth.user.uuid === props.booking.user_uuid || session.auth.user.isAdmin;
});

watch(() => props.dialog, (val) => {
  internalDialog.value = val
})

watch(internalDialog, (val) => {
  emit('update:dialog', val)
})
</script>

<style scoped>
.btn-delete {
  color: #f44336;
}

.btn-edit {
  color: #0077d9;
}

.action-buttons {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  z-index: 1;
}

.title-container {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px;
  max-width: 70%;
}

.booking-title {
  flex: 1 1 100%;
  word-break: break-word;
  white-space: normal;
}

.edited-tag {
  font-size: 11px;
  color: #777;
  font-style: italic;
  font-weight: normal;
  margin-top: 1px;
}

.info-line {
  display: flex;
  align-items: center;
  font-size: 15px;
  color: #333;
}

.color-box {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  margin-right: 8px;
}

.delete-dialog {
  overflow: hidden;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
}

.delete-header {
  display: flex;
  justify-content: center;
  padding-top: 20px;
}

.text-error {
  color: #f44336;
  font-weight: 600;
}

.booking-info-box {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin: 0 auto;
  background-color: #f5f5f5;
  text-align: left;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.booking-info-title {
  background-color: #eeeeee;
  padding: 10px 15px;
  font-weight: 600;
  border-bottom: 1px solid #e0e0e0;
  color: #333;
}

.booking-info-details {
  padding: 12px 15px;
}

.info-row {
  display: flex;
  margin-bottom: 6px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  width: 70px;
  font-weight: 500;
  color: #666;
}

.info-value {
  flex: 1;
  font-weight: 500;
  color: #333;
}
</style>
