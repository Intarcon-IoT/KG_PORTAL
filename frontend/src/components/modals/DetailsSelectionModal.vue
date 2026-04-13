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
              <v-select
                v-model="bookingInfo.facility_uuid"
                :items="props.installations"
                item-title="name"
                item-value="uuid"
                label="Edificio"
                @update:modelValue="onFacilityChange"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <v-select
                v-model="bookingInfo.room_uuid"
                :items="availableRooms"
                item-title="name"
                item-value="uuid"
                label="Sala"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="bookingInfo.dateFrom"
                label="Desde"
                type="date"
                :min="today"
                @click="goBack"
              />
            </v-col>
            <v-col cols="6">
              <!-- SELECT TIME FROM -->
              <v-select
                v-model="bookingInfo.timeFrom"
                label="Desde"
                :items="timeIntervalsFrom"
                item-title= "hour"
                item-value="hour"
                @update:modelValue="onChangeTimeFrom"
              >
                <template #item="{ props, item }">
                  <v-list-item
                    v-bind="props"
                    :disabled="item.raw.disabled"
                    :class="{ 
                      'text-error': item.raw.status === 'Approved' || (item.raw.disabled && item.raw.status !== 'Rejected'),
                      'text-warning': item.raw.status === 'Rejected' && !item.raw.disabled
                    }"
                  >
                    <template #prepend v-if="item.raw.status === 'Rejected' && !item.raw.disabled">
                      <v-icon icon="fa-solid fa-clock-rotate-left" color="warning" size="x-small" class="mr-2"></v-icon>
                    </template>
                    <v-tooltip v-if="item.raw.status === 'Rejected' && !item.raw.disabled" activator="parent" location="end">
                      Existe una reserva pendiente de validación en este tramo horario
                    </v-tooltip>
                  </v-list-item>
                </template>
              </v-select>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="bookingInfo.dateTo"
                label="Hasta"
                type="date"
                :min="bookingInfo.dateFrom || today"
                :max="firstBookingFromTimeFrom?.start_date ? moment(firstBookingFromTimeFrom.start_date).format('YYYY-MM-DD') : undefined"
                @update:modelValue="onChangeDateTo"
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="bookingInfo.timeTo"
                label="Hasta"
                item-title= "hour"
                item-value="hour"
                :items="timeIntervalsTo"
              >
                <template #item="{ props, item }">
                  <v-list-item
                    v-bind="props"
                    :disabled="item.raw.disabled"
                    :class="{ 
                      'text-error': item.raw.status === 'Approved' || (item.raw.disabled && item.raw.status !== 'Rejected'),
                      'text-warning': item.raw.status === 'Rejected' && !item.raw.disabled
                    }"
                  >
                    <template #prepend v-if="item.raw.status === 'Rejected' && !item.raw.disabled">
                      <v-icon icon="fa-solid fa-clock-rotate-left" color="warning" size="x-small" class="mr-2"></v-icon>
                    </template>
                    <v-tooltip v-if="item.raw.status === 'Rejected' && !item.raw.disabled" activator="parent" location="end">
                      Existe una reserva pendiente de validación en este tramo horario
                    </v-tooltip>
                  </v-list-item>
                </template>
              </v-select>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="bookingInfo.title"
                label="Título de la Reserva"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <v-textarea
                v-model="bookingInfo.details"
                label="Detalles de la Reserva"
              />
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
import { useNotificationStore, sessionStore } from '@/store';
import moment from 'moment';
import Request from "@/model/request";

const props = defineProps({
  dialog: Boolean,
  booking: Object,
  installations: Array,
  rooms: Array,
  isEditMode: {
    default: false
  },
})

const emit = defineEmits(['update:dialog', 'confirmBooking', 'back', 'cancelEdit'])

const dialog = ref(props.dialog)
const isEditMode = computed(() => props.isEditMode)
const notificationStore = useNotificationStore()
const session = sessionStore();
const today = new Date().toISOString().substring(0, 10)

const timeIntervalsFrom = ref(generateTimeIntervals())
const timeIntervalsTo = ref(generateTimeIntervals())

const availableRooms = ref([])
const bookingOnRange = ref([]);

const firstBookingFromTimeFrom = ref('');

const bookingInfo = ref({
  uuid: '',
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
  emit('update:dialog', false)
  
  if (isEditMode.value) {
    emit('cancelEdit')
  }
}

function onChangeDateTo() {
  updateBookingByRangeSelected()
}

function onChangeTimeFrom() {
  nextBooking(bookingInfo.value.dateFrom, bookingInfo.value.timeFrom)
  updateTimeIntervalsByBookingOnRange()
  updateTimeSelectedTo()
}

function onFacilityChange(newFacilityUuid) {
  availableRooms.value = props.rooms.filter(room => room.facility_uuid === newFacilityUuid) || []
  bookingInfo.value.room_uuid = ''
}

function generateTimeIntervals() {
  const intervals = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = moment({ hour, minute }).format('HH:mm')
      intervals.push({
        hour: time,
        disabled: false,
        status: 'Pending'
      })
    }
  }
  return intervals
}

function updateTimeIntervalsByBookingOnRange() {
  const updatedFrom = generateTimeIntervals();
  const updatedTo = generateTimeIntervals();

  updatedFrom.forEach(interval => {
    const booking = getBookingAt(interval.hour, false, bookingInfo.value.dateFrom);
    if (booking) {
      interval.status = isBlocking(booking) ? 'Approved' : 'Rejected';
      interval.disabled = isBlocking(booking);
    }
  });

  let confirmedBookingFound = false;
  let timeFromReached = false;
  const isSameDate = bookingInfo.value.dateFrom === bookingInfo.value.dateTo;

  updatedTo.forEach(interval => {
    if (!timeFromReached && isSameDate) {
      interval.disabled = true;
      timeFromReached = interval.hour === bookingInfo.value.timeFrom;
    } else if (!confirmedBookingFound) {
      const booking = getBookingAt(interval.hour, true, bookingInfo.value.dateTo);
      if (booking) {
        interval.status = isBlocking(booking) ? 'Approved' : 'Rejected';
        interval.disabled = isBlocking(booking);
        confirmedBookingFound = isBlocking(booking);
      }
    } else {
      interval.disabled = true;
      interval.status = 'Approved';
    }
  });

  timeIntervalsFrom.value = updatedFrom;
  timeIntervalsTo.value = updatedTo;

  const currentToBooking = getBookingAt(bookingInfo.value.timeTo, true, bookingInfo.value.dateTo);
  if (currentToBooking && isBlocking(currentToBooking)) {
    if (firstBookingFromTimeFrom.value && isBlocking(firstBookingFromTimeFrom.value)) {
      bookingInfo.value.timeTo = moment(firstBookingFromTimeFrom.value.start_time, 'HH:mm:ss').format('HH:mm');
    }
  }
}

function isBlocking(booking) {
  if (!booking) return false;
  return booking.status === 'Approved' || (booking.status === 'Pending' && booking.user_uuid === session.auth.user.uuid);
}

function getBookingAt(hour, isEndCheck, date) {
  if (!bookingOnRange.value || bookingOnRange.value.length === 0 || !date) {
    return null;
  }

  const formattedDate = moment(date).format('YYYY-MM-DD');
  const currentDateTime = moment(`${formattedDate}T${hour}`);

  if (isEditMode.value) {
    const startDate = moment(bookingInfo.value.dateFrom).format('YYYY-MM-DD');
    const endDate = moment(bookingInfo.value.dateTo).format('YYYY-MM-DD');
    const startDateTime = moment(`${startDate}T${bookingInfo.value.timeFrom}`);
    const endDateTime = moment(`${endDate}T${bookingInfo.value.timeTo}`);

    if (isEndCheck) {
      if (currentDateTime.isAfter(startDateTime) && currentDateTime.isSameOrBefore(endDateTime)) {
        return null;
      }
    } else {
      if (currentDateTime.isSameOrAfter(startDateTime) && currentDateTime.isBefore(endDateTime)) {
        return null;
      }
    }
  }

  return bookingOnRange.value.find(booking => {
    const startDate = moment(booking.start_date).format('YYYY-MM-DD');
    const endDate = moment(booking.end_date || booking.start_date).format('YYYY-MM-DD');
    const startDateTime = moment(`${startDate}T${booking.start_time}`);
    const endDateTime = moment(`${endDate}T${booking.end_time}`);

    if (isEndCheck) {
      return currentDateTime.isAfter(startDateTime) && currentDateTime.isSameOrBefore(endDateTime);
    } else {
      return currentDateTime.isSameOrAfter(startDateTime) && currentDateTime.isBefore(endDateTime);
    }
  });
}

function isConfirmedAt(hour, isEndCheck, date) {
  const booking = getBookingAt(hour, isEndCheck, date);
  return isBlocking(booking);
}

function updateTimeSelectedTo() {
  const defaultTo = addOneHour(bookingInfo.value.timeFrom);
  const defaultMoment = moment(defaultTo, 'HH:mm');

  const conflict = bookingOnRange.value.find(booking => {
    const start = moment(booking.start_time, 'HH:mm');
    const end = moment(booking.end_time, 'HH:mm');
    return isBlocking(booking) && defaultMoment.isSameOrAfter(start) && defaultMoment.isSameOrBefore(end);
  });

  if (conflict) {
    bookingInfo.value.timeTo = moment(conflict.start_time, 'HH:mm').format('HH:mm');
  } else {
    bookingInfo.value.timeTo = defaultTo;
  }
}

async function nextBooking(dateFrom, timeFrom) {
  const requestBookingByDay = new Request({
    endpoint: 'bookings',
    method: 'GET',
    params: {
      room_uuid: bookingInfo.value.room_uuid,
      from_date: dateFrom,
      from_time: timeFrom,
      first_only: true
    }
  });
  await requestBookingByDay.http().then(res => {
    firstBookingFromTimeFrom.value = res[0];
  })
  .catch(err => notificationStore.notifyError(err.message))
}

async function updateBookingByRangeSelected(){

  const requestBookingByDay = new Request({
    endpoint: 'bookings',
    method: 'GET',
    params: {
      room_uuid: bookingInfo.value.room_uuid,
      from_date: bookingInfo.value.dateFrom,
      to_date: bookingInfo.value.dateTo,
    }
  });
  await requestBookingByDay.http().then(res => {
    bookingOnRange.value = res;
  })
  .catch(err => notificationStore.notifyError(err.message))
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

function confirmReservation() {

  let isValid = true;

  if( isConfirmedAt(bookingInfo.value.timeFrom, false, bookingInfo.value.dateFrom) || isConfirmedAt(bookingInfo.value.timeTo, true, bookingInfo.value.dateTo)) {
    notificationStore.notifyWarning('La hora de inicio o finalización ya está reservada.');
    isValid = false;
  }
  if(bookingInfo.value.room_uuid === '') {
    notificationStore.notifyWarning('Por favor, seleccione una sala.');
    isValid = false;
  }
  if(!bookingInfo.value.title || bookingInfo.value.title.trim() === '') {
    notificationStore.notifyWarning('Por favor, introduzca un título para la reserva.');
    isValid = false;
  }

  if(isValid){
    emit('update:dialog', false)
    emit('confirmBooking', { ...bookingInfo.value })
  }
}

watch(() => props.dialog, async (val) => {
  dialog.value = val

  if (val) {
    bookingInfo.value.facility_uuid = props.booking.facility.uuid
    bookingInfo.value.room_uuid = props.booking.room.uuid
    bookingInfo.value.dateFrom = toDateString(props.booking.date)
    bookingInfo.value.timeFrom = moment(props.booking.time, 'HH:mm').format('HH:mm')
    bookingInfo.value.title = props.booking.title
    bookingInfo.value.details = props.booking.details

    if(isEditMode.value) {
      bookingInfo.value.uuid = props.booking.uuid
      bookingInfo.value.dateTo = toDateString(props.booking.dateTo)
      bookingInfo.value.timeTo = moment(props.booking.timeTo, 'HH:mm').format('HH:mm')
    } else {
      bookingInfo.value.uuid = ''
      bookingInfo.value.dateTo = toDateString(props.booking.date)
      bookingInfo.value.timeTo = addOneHour(props.booking.time)
    }

    availableRooms.value = props.rooms.filter(room => room.facility_uuid === props.booking.facility.uuid)

    await nextBooking(bookingInfo.value.dateFrom, bookingInfo.value.timeFrom)
    await updateBookingByRangeSelected()

    if(!isEditMode.value) {
      updateTimeSelectedTo()
    }
  }
})

watch(bookingOnRange, () => {
  updateTimeIntervalsByBookingOnRange()
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

.text-warning {
  color: #fb8c00 !important;
}

.text-error {
  color: #ff5252 !important;
}

.dialog-content {
  max-height: 400px;
  overflow-y: auto;
}

.v-btn {
  border-radius: 12px;
}
</style>
