<template>
  <v-dialog v-model="dialog" max-width="600" transition="dialog-bottom-transition" persistent>
    <v-card class="pa-4 rounded-xl">
      <v-card-title class="d-flex align-center position-relative text-subtitle-1 font-weight-medium text-grey-darken-3">
        <i v-if="!isEditMode" class="fa-solid fa-arrow-left position-absolute start-5 fa-lg back-icon" @click="goBack"></i>
        <div class="w-100 text-center">{{ isEditMode ? 'Editar Reserva' : 'Detalles de la Reserva' }}</div>
        <i class="fa-solid fa-xmark position-absolute fa-lg close-icon" @click="cancelAndClose"></i>
      </v-card-title>
      <v-card-text class="dialog-content">
        <v-container>
          <v-row>
            <v-col cols="12">
              <v-select v-model="form.facility_uuid" :items="props.installations" item-title="name" item-value="uuid"
                label="Edificio" @update:modelValue="onFacilityChange" />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <v-select v-model="form.room_uuid" :items="availableRooms" item-title="name" item-value="uuid"
                label="Sala" />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-text-field v-model="form.dateFrom" label="Desde" type="date" :min="today" />
            </v-col>
            <v-col cols="6">
              <v-select v-model="form.timeFrom" label="Desde" :items="timeIntervals" />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-text-field v-model="form.dateTo" label="Hasta" type="date" :min="form.dateFrom || today" />
            </v-col>
            <v-col cols="6">
              <v-select v-model="form.timeTo" label="Hasta" :items="timeIntervals" />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <v-text-field 
                v-model="form.title"
                label="Título de la Reserva *"
                :rules="[v => !!v || 'El título es obligatorio']"
                required
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <v-textarea v-model="form.details" label="Detalles de la Reserva" />
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="confirmReservation" class="confirm-btn">
          {{ isEditMode ? 'Actualizar Reserva' : 'Confirmar Reserva' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useNotificationStore } from '@/store';

const notificationStore = useNotificationStore()

const props = defineProps({
  booking: Object,
  bookingsList: Array,
  dialog: Boolean,
  installations: Array,
  rooms: Array,
  isEditMode: {
    default: false
  },
  editBooking: {
    default: () => ({})
  }
})

const emit = defineEmits(['update:dialog', 'confirmBooking', 'back', 'cancelEdit'])

const today = new Date().toISOString().substring(0, 10)
const availableRooms = ref([])
const timeIntervals = generateTimeIntervals()
const dialog = ref(props.dialog)
const isEditMode = computed(() => props.isEditMode)

const form = ref({
  facility_uuid: '',
  room_uuid: '',
  dateFrom: '',
  timeFrom: '',
  dateTo: '',
  timeTo: '',
  title: '',
  details: ''
})

function goBack() {
  emit('update:dialog', false)
  emit('back')
}

function cancelAndClose() {
  dialog.value = false
  emit('update:dialog', false)
  
  if (isEditMode.value) {
    emit('cancelEdit')
  }
}

function generateTimeIntervals() {
  const intervals = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const formattedHour = hour.toString().padStart(2, '0')
      const formattedMinute = minute.toString().padStart(2, '0')
      intervals.push(`${formattedHour}:${formattedMinute}`)
    }
  }
  return intervals
}

function addOneHour(hour) {
  if (!hour) return ''
  const [h, m] = hour.split(':').map(Number)
  const nuevaHora = new Date()
  nuevaHora.setHours(h + 1)
  nuevaHora.setMinutes(m)
  return nuevaHora.toTimeString().substring(0, 5)
}

function toDateString(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

function isValidDateTimeRange() {
  if (!form.value.dateFrom || !form.value.timeFrom || !form.value.dateTo || !form.value.timeTo) {
    return false
  }

  const from = new Date(`${form.value.dateFrom}T${form.value.timeFrom}`)
  const to = new Date(`${form.value.dateTo}T${form.value.timeTo}`)

  return to >= from
}

function onFacilityChange(newFacilityUuid) {
  availableRooms.value = props.rooms.filter(room => room.facility_uuid === newFacilityUuid) || []
  form.value.room_uuid = ''
}

function confirmReservation() {
  if (!isValidDateTimeRange()) {
    notificationStore.notifyWarning('La fecha/hora de finalización no puede ser anterior a la de inicio.');
    return
  }

  if (!form.value.title.trim()) {
    notificationStore.notifyWarning('El título de la reserva es obligatorio.');
    return;
  }

  // isEditMode = false;
  emit('update:dialog', false)
  emit('confirmBooking', { ...form.value, isEditCompleted: isEditMode.value })
}

watch(() => props.dialog, (val) => {
  dialog.value = val

  if (val) {
    if (props.isEditMode && props.editBooking) {
      const roomData = props.rooms.find(room => room.uuid === props.editBooking.room_uuid) || {}
      const facilityUuid = roomData.facility_uuid

      const formatTime = (time) => time ? time.split(':').slice(0, 2).join(':') : '';

      form.value.facility_uuid = facilityUuid || ''
      form.value.room_uuid = props.editBooking.room_uuid || ''
      form.value.dateFrom = toDateString(props.editBooking.start_date) || ''
      form.value.timeFrom = formatTime(props.editBooking.start_time) || ''
      form.value.dateTo = toDateString(props.editBooking.end_date) || ''
      form.value.timeTo = formatTime(props.editBooking.end_time) || ''
      form.value.title = props.editBooking.title || ''
      form.value.details = props.editBooking.details || ''
      console.log(isEditMode.value, props.editBooking)

      availableRooms.value = props.rooms.filter(room => room.facility_uuid === facilityUuid)
    } else {
      form.value.facility_uuid = props.booking.facility?.uuid || ''
      form.value.room_uuid = props.booking.room?.uuid || ''
      form.value.dateFrom = toDateString(props.booking.date) || ''
      form.value.timeFrom = props.booking.time || ''
      form.value.dateTo = toDateString(props.booking.date) || ''
      form.value.timeTo = addOneHour(props.booking.time || '00:00')
      form.value.title = ''
      form.value.details = ''

      availableRooms.value = props.rooms.filter(room => room.facility_uuid === props.booking.facility?.uuid)
    }
  }
})

watch(dialog, (val) => {
  emit('update:dialog', val)
})
</script>

<style scoped>
.close-icon {
  position: absolute;
  right: 0;
  margin-right: 12px;
  cursor: pointer;
  color: #666;
  transition: transform 0.2s ease, color 0.2s ease;
}

.close-icon:hover {
  color: #ff5252;
}

.back-icon {
  cursor: pointer;
  color: #666;
  transition: transform 0.2s ease, color 0.2s ease;
}

.back-icon:hover {
  color: #24008f;
}

.confirm-btn {
  font-weight: bold;
  text-transform: uppercase;
}

.dialog-content {
  max-height: 400px;
  overflow-y: auto;
}

.v-btn {
  border-radius: 12px;
}
</style>
