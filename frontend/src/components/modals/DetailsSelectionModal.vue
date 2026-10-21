<template>
  <appDialog
    v-model="dialog" :eyebrow="isEditMode ? '' : 'Nueva reserva · Paso 4 de 4'" :title="isEditMode ? 'Editar reserva' : 'Detalles de la reserva'"
    :width="600" :back="!isEditMode" @back="goBack" @close="cancelAndClose"
  >
    <div class="fields">
      <div class="kg-row">
        <formField label="Sede" column>
          <v-select v-model="bookingInfo.facility_uuid" autocomplete="off" :items="props.installations" item-title="name" item-value="uuid" hide-details @update:model-value="onFacilityChange" />
        </formField>
        <formField label="Sala" column>
          <v-select v-model="bookingInfo.room_uuid" autocomplete="off" :items="availableRooms" item-title="name" item-value="uuid" placeholder="Selecciona una" hide-details @update:model-value="refreshAvailability" />
        </formField>
      </div>
      <!-- Una reserva ocupa un solo día; para varios días está la repetición -->
      <div class="when">
        <formField label="Fecha" column>
          <dateField v-model="bookingInfo.dateFrom" :min="today" @update:model-value="onChangeDate" />
        </formField>
        <formField label="Desde" column>
          <v-select v-model="bookingInfo.timeFrom" autocomplete="off" :items="timeIntervalsFrom" item-title="hour" item-value="hour" hide-details @update:model-value="onChangeTimeFrom">
            <template #item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps" :disabled="item.disabled" :class="slotClass(item)">
                <template v-if="isPendingSlot(item)" #prepend><i class="fa-solid fa-clock-rotate-left slot-icon" /></template>
                <v-tooltip v-if="isPendingSlot(item)" activator="parent" location="end">Hay una reserva pendiente de validación en este tramo</v-tooltip>
              </v-list-item>
            </template>
          </v-select>
        </formField>
        <formField label="Hasta" column>
          <v-select v-model="bookingInfo.timeTo" autocomplete="off" :items="timeIntervalsTo" item-title="hour" item-value="hour" hide-details>
            <template #item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps" :disabled="item.disabled" :class="slotClass(item)">
                <template v-if="isPendingSlot(item)" #prepend><i class="fa-solid fa-clock-rotate-left slot-icon" /></template>
                <v-tooltip v-if="isPendingSlot(item)" activator="parent" location="end">Hay una reserva pendiente de validación en este tramo</v-tooltip>
              </v-list-item>
            </template>
          </v-select>
        </formField>
      </div>
      <formField label="Título" column>
        <v-text-field v-model="bookingInfo.title" autocomplete="off" placeholder="Ej.: Reunión de equipo" hide-details />
      </formField>
      <formField label="Detalles" column>
        <v-textarea v-model="bookingInfo.details" autocomplete="off" placeholder="Opcional" rows="2" auto-grow hide-details />
      </formField>
      <label v-if="!isEditMode" class="kg-check">
        <input v-model="repeatBooking" type="checkbox" />
        <span class="kg-check-box"><i class="fa-solid fa-check" /></span>
        Repetir esta reserva en otras fechas
      </label>
    </div>

    <template #actions>
      <v-btn variant="outlined" class="kg-btn kg-btn-ghost" @click="cancelAndClose">Cancelar</v-btn>
      <v-btn color="primary" variant="flat" class="kg-btn" @click="confirmReservation">{{ actionButtonText }}</v-btn>
    </template>
  </appDialog>
</template>

<script setup>
import appDialog from '@/components/app-dialog.vue'
import { formField, dateField } from '@/components/form-components'
import { toDateKey, useToday } from '@/utils/dates'
import { ref, watch, computed } from 'vue'
import { useNotificationStore, sessionStore } from '@/store';
import moment from 'moment';
import Request from "@/model/request";
import { BOOKING_STATUS } from '@/utils/constants';

const props = defineProps({
  dialog: Boolean,
  booking: Object,
  installations: Array,
  rooms: Array,
  isEditMode: {
    default: false
  },
})

const emit = defineEmits(['update:dialog', 'confirmBooking', 'next', 'back', 'cancelEdit'])

const dialog = ref(props.dialog)
const isEditMode = computed(() => props.isEditMode)
const notificationStore = useNotificationStore()
const session = sessionStore();
const today = useToday()
const repeatBooking = ref(false)

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

const actionButtonText = computed(() => {
  if (isEditMode.value) return 'Guardar cambios'
  return repeatBooking.value ? 'Configurar repetición' : 'Crear reserva'
})

// Tramos del selector de hora: REJECTED marca un tramo con reserva pendiente de otra persona
const isPendingSlot = item => item.status === BOOKING_STATUS.REJECTED && !item.disabled
const slotClass = item => ({ 'slot-busy': item.status === BOOKING_STATUS.APPROVED, 'slot-pending': isPendingSlot(item) })

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

// La fecha de fin siempre es la de inicio
function onChangeDate(date) {
  bookingInfo.value.dateTo = date
  refreshAvailability()
}

async function refreshAvailability() {
  if (!bookingInfo.value.room_uuid || !bookingInfo.value.dateFrom) return
  await nextBooking(bookingInfo.value.dateFrom, bookingInfo.value.timeFrom)
  await updateBookingByRangeSelected()
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
        status: BOOKING_STATUS.PENDING
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
      interval.status = isBlocking(booking) ? BOOKING_STATUS.APPROVED : BOOKING_STATUS.REJECTED;
      interval.disabled = isBlocking(booking);
    }

    if (!interval.disabled && bookingInfo.value.dateFrom === today.value) {
      const now = moment();
      const intervalTime = moment(`${today.value} ${interval.hour}`, 'YYYY-MM-DD HH:mm');
      if (intervalTime.isBefore(now)) {
        interval.disabled = true;
      }
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
        interval.status = isBlocking(booking) ? BOOKING_STATUS.APPROVED : BOOKING_STATUS.REJECTED;
        interval.disabled = isBlocking(booking);
        confirmedBookingFound = isBlocking(booking);
      }
    } else {
      interval.disabled = true;
      interval.status = BOOKING_STATUS.APPROVED;
    }

    if (!interval.disabled && bookingInfo.value.dateTo === today.value) {
      const now = moment();
      const intervalTime = moment(`${today.value} ${interval.hour}`, 'YYYY-MM-DD HH:mm');
      if (intervalTime.isBefore(now)) {
        interval.disabled = true;
      }
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
  return booking.status === BOOKING_STATUS.APPROVED || (booking.status === BOOKING_STATUS.PENDING && booking.user_uuid === session.auth.user.uuid);
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
  return toDateKey(date)
}

function confirmReservation() {

  let isValid = true;

  if( isConfirmedAt(bookingInfo.value.timeFrom, false, bookingInfo.value.dateFrom) || isConfirmedAt(bookingInfo.value.timeTo, true, bookingInfo.value.dateTo)) {
    notificationStore.notifyWarning('La hora de inicio o finalización ya está reservada.');
    isValid = false;
  }
  if (!bookingInfo.value.dateFrom) {
    notificationStore.notifyWarning('Por favor, seleccione una fecha.')
    isValid = false
  }
  if(bookingInfo.value.room_uuid === '') {
    notificationStore.notifyWarning('Por favor, seleccione una sala.');
    isValid = false;
  }
  
  if (bookingInfo.value.dateFrom === today.value) {
    const now = moment();
    const startTime = moment(`${today.value} ${bookingInfo.value.timeFrom}`, 'YYYY-MM-DD HH:mm');
    if (startTime.isBefore(now)) {
      notificationStore.notifyWarning('La hora de inicio ya ha pasado.');
      isValid = false;
    }
  }

  if(!bookingInfo.value.title || bookingInfo.value.title.trim() === '') {
    notificationStore.notifyWarning('Por favor, introduzca un título para la reserva.');
    isValid = false;
  }

  if(isValid){
    emit('update:dialog', false)
    if (isEditMode.value) {
      emit('confirmBooking', { ...bookingInfo.value })
      return
    }
    if (repeatBooking.value) {
      emit('next', { ...bookingInfo.value })
    } else {
      emit('confirmBooking', { ...bookingInfo.value })
    }
  }
}

watch(() => props.dialog, async (val) => {
  dialog.value = val

  if (val) {
    repeatBooking.value = false
    bookingInfo.value.facility_uuid = props.booking.facility.uuid
    bookingInfo.value.room_uuid = props.booking.room.uuid
    bookingInfo.value.dateFrom = toDateString(props.booking.date)
    bookingInfo.value.timeFrom = moment(props.booking.time, 'HH:mm').format('HH:mm')
    bookingInfo.value.title = props.booking.title
    bookingInfo.value.details = props.booking.details

    if(isEditMode.value) {
      bookingInfo.value.uuid = props.booking.uuid
      bookingInfo.value.dateTo = bookingInfo.value.dateFrom
      bookingInfo.value.timeTo = moment(props.booking.timeTo, 'HH:mm').format('HH:mm')
    } else {
      bookingInfo.value.uuid = ''
      bookingInfo.value.dateTo = bookingInfo.value.dateFrom
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
.fields { display: flex; flex-direction: column; gap: 14px }
.when { display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: 14px }
@media (width < 600px) { .when { grid-template-columns: 1fr 1fr } .when > :first-child { grid-column: 1 / -1 } }

/* Tramos del selector de hora (el menú se renderiza con este scope) */
.slot-busy { color: #b91c1c }
.slot-pending { color: #b45309 }
.slot-icon { margin-right: 8px; font-size: .75rem; color: #b45309 }
</style>
