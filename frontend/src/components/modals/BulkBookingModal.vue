<template>
  <appDialog v-model="dialog" eyebrow="Nueva reserva · Repetición" title="Repetir reserva" :width="560" back @back="goBack" @close="cancelAndClose">
    <div class="fields">
      <div v-if="bookingInfo" class="summary">
        <i class="fa-regular fa-calendar" />
        <span><strong>{{ bookingInfo.title }}</strong> · {{ bookingInfo.timeFrom }} – {{ bookingInfo.timeTo }}</span>
      </div>

      <formField label="Frecuencia" column>
        <v-select v-model="repeatMode" autocomplete="off" :items="repeatOptions" hide-details @update:model-value="onRepeatModeChange" />
      </formField>

      <formField :label="`Fechas (${selectedDates.length} seleccionada${selectedDates.length === 1 ? '' : 's'})`" column>
        <v-date-picker
          v-model="selectedDates" multiple hide-header control-variant="modal" color="primary" :min="today" :allowed-dates="allowedDates"
          width="100%" elevation="0" show-adjacent-months class="picker"
        />
      </formField>

      <v-alert v-if="verificationError" type="error" variant="tonal" density="compact" icon="fa-solid fa-triangle-exclamation" class="error-box">{{ verificationError }}</v-alert>
    </div>

    <template #actions>
      <v-btn variant="outlined" class="kg-btn kg-btn-ghost" @click="cancelAndClose">Cancelar</v-btn>
      <v-btn color="primary" variant="flat" class="kg-btn" :loading="isVerifying" :disabled="selectedDates.length === 0" @click="confirmBulkReservation">
        Confirmar reserva{{ selectedDates.length > 1 ? 's' : '' }}
      </v-btn>
    </template>
  </appDialog>
</template>

<script setup>
import appDialog from '@/components/app-dialog.vue'
import { formField } from '@/components/form-components'
import { useToday } from '@/utils/dates'
import { ref, watch, nextTick, computed } from 'vue'
import { useNotificationStore, sessionStore, useBookingStore } from '@/store';
import moment from 'moment';
import { BOOKING_STATUS } from '@/utils/constants';

const props = defineProps({
  dialog: Boolean,
  initialBooking: Object
})

const emit = defineEmits(['update:dialog', 'confirmBulkBooking', 'back'])

const dialog = ref(props.dialog)
const notificationStore = useNotificationStore()
const bookingStore = useBookingStore()
const session = sessionStore()

const repeatMode = ref('none')
const selectedDates = ref([])
const isVerifying = ref(false)
const verificationError = ref(null)
const today = useToday()
const isTodaySelectable = computed(() => {
  if (!bookingInfo.value?.timeFrom) return true;
  const now = moment();
  const todayTime = moment(`${today.value} ${bookingInfo.value.timeFrom}`, 'YYYY-MM-DD HH:mm');
  return todayTime.isAfter(now);
});

let isProgrammaticUpdate = false;

const bookingInfo = ref(null)

const repeatOptions = [
  { title: 'Solo esta fecha', value: 'none' },
  { title: 'Toda la semana (Lun-Vie)', value: 'week_work' },
  { title: 'Todo el mes (Lun-Vie)', value: 'month_work' },
  { title: 'El mismo día todo el mes', value: 'same_day_month' },
  { title: 'Personalizado', value: 'custom' },
]

function goBack() {
  emit('update:dialog', false)
  emit('back')
}

function allowedDates(date) {
  const dateStr = getDayString(date);
  if (dateStr === today.value) {
    return isTodaySelectable.value;
  }
  return true;
}

function cancelAndClose() {
  emit('update:dialog', false)
  isProgrammaticUpdate = true;
  selectedDates.value = []
  repeatMode.value = 'none'
  verificationError.value = null
  nextTick(() => { isProgrammaticUpdate = false; })
}

function getDayString(date) {
  const d = new Date(date)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]
}

async function onRepeatModeChange(mode) {
  verificationError.value = null
  if (!bookingInfo.value || !bookingInfo.value.dateFrom) return;
  
  const originalDate = moment(bookingInfo.value.dateFrom)
  const newSelected = []
  
  if (originalDate.format('YYYY-MM-DD') !== today.value || isTodaySelectable.value) {
    newSelected.push(originalDate.toDate())
  }

  if (mode === 'none') {
    isProgrammaticUpdate = true;
    selectedDates.value = newSelected
    await nextTick();
    isProgrammaticUpdate = false;
    return
  }

  if (mode === 'week_work') {
    const startOfWeek = originalDate.clone().startOf('isoWeek')
    for (let i = 0; i < 5; i++) {
        const d = startOfWeek.clone().add(i, 'days')
        const dStr = d.format('YYYY-MM-DD')
        if (d.isSameOrAfter(moment(), 'day')) {
          if (dStr === today.value && !isTodaySelectable.value) continue;
          if (!d.isSame(originalDate, 'day')) {
            newSelected.push(d.toDate())
          }
        }
    }
  }

  if (mode === 'month_work') {
    const startOfMonth = originalDate.clone().startOf('month')
    const daysInMonth = startOfMonth.daysInMonth()
    for (let i = 0; i < daysInMonth; i++) {
      const d = startOfMonth.clone().add(i, 'days')
      const dStr = d.format('YYYY-MM-DD')
      if (d.isoWeekday() <= 5 && d.isSameOrAfter(moment(), 'day')) {
        if (dStr === today.value && !isTodaySelectable.value) continue;
        if (!d.isSame(originalDate, 'day')) {
          newSelected.push(d.toDate())
        }
      }
    }
  }

  if (mode === 'same_day_month') {
    const weekday = originalDate.day()
    const startOfMonth = originalDate.clone().startOf('month')
    const endOfMonth = originalDate.clone().endOf('month')
    const current = startOfMonth.clone()

    while (current.day() !== weekday) {
      current.add(1, 'day')
    }

    while (current.isSameOrBefore(endOfMonth)) {
      const dStr = current.format('YYYY-MM-DD')
      if (current.isSameOrAfter(moment(), 'day')) {
        if (dStr === today.value && !isTodaySelectable.value) {
           current.add(7, 'days')
           continue;
        }
        if (!current.isSame(originalDate, 'day')) {
          newSelected.push(current.toDate())
        }
      }
      current.add(7, 'days')
    }
  }

  if (mode !== 'custom') {
    isProgrammaticUpdate = true;
    selectedDates.value = newSelected
    await nextTick();
    isProgrammaticUpdate = false;
  }
}

watch(selectedDates, (newVal) => {
  if (isProgrammaticUpdate) return;

  if (!isTodaySelectable.value) {
    const todayIndex = newVal.findIndex(d => getDayString(d) === today.value);
    if (todayIndex !== -1) {
      newVal.splice(todayIndex, 1);
      notificationStore.notifyWarning('No se puede seleccionar el día de hoy porque la hora de la reserva ya ha pasado.');
      return;
    }
  }

  if (repeatMode.value !== 'custom') {
    repeatMode.value = 'custom'
  }
}, { deep: true })

async function verifyConflicts(datesToBook) {
  if (datesToBook.length === 0) return true;

  const datesFormatted = datesToBook.map(d => getDayString(d)).sort()
  const minDate = datesFormatted[0]
  const maxDate = datesFormatted[datesFormatted.length - 1]

  try {
    const existingBookings = await bookingStore.fetchBookingsByDateRange(
      bookingInfo.value.room_uuid, 
      minDate, 
      maxDate
    );
    
    const startSecToTest = timeToSecs(bookingInfo.value.timeFrom);
    const endSecToTest = timeToSecs(bookingInfo.value.timeTo);
    const errors = [];

    for (let currentStrDate of datesFormatted) {
      const conflicts = existingBookings.filter(b => {
        const bStartStr = moment(b.start_date).format('YYYY-MM-DD');
        const bEndStr = moment(b.end_date || b.start_date).format('YYYY-MM-DD');

        if (currentStrDate >= bStartStr && currentStrDate <= bEndStr) {
            const bStartSec = timeToSecs(b.start_time);
            const bEndSec = timeToSecs(b.end_time);

            if (startSecToTest < bEndSec && endSecToTest > bStartSec) {
                if (bookingInfo.value.needsValidation) {
                  if (b.status === BOOKING_STATUS.APPROVED || (b.status === BOOKING_STATUS.PENDING && b.user_uuid === session.auth.user.uuid)) {
                    return true;
                  }
                } else {
                  if (b.status === BOOKING_STATUS.APPROVED || b.status === BOOKING_STATUS.PENDING) {
                    return true;
                  }
                }
            }
        }
        return false;
      });

      if (conflicts.length > 0) {
        errors.push(`Conflicto de horario en la fecha ${moment(currentStrDate).format('DD-MM-YYYY')}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join(' \n'));
    }

    if (datesFormatted.includes(today.value) && !isTodaySelectable.value) {
        throw new Error(`La hora de la reserva ya ha pasado para el día de hoy (${moment(today.value).format('DD-MM-YYYY')})`);
    }

    return true;
  } catch (err) {
    verificationError.value = err.message || 'Error validando conflictos.';
    return false;
  }
}

function timeToSecs(timeStr) {
  if(!timeStr) return 0;
  const parts = timeStr.split(':')
  return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + (parts[2] ? parseInt(parts[2]) : 0);
}

async function confirmBulkReservation() {
  if (!selectedDates.value || selectedDates.value.length === 0) {
    notificationStore.notifyWarning('Debes seleccionar al menos una fecha.');
    return;
  }

  verificationError.value = null;
  isVerifying.value = true;
  
  const isValid = await verifyConflicts(selectedDates.value);
  isVerifying.value = false;

  if (!isValid) {
    notificationStore.notifyWarning("Existen conflictos de horario en las fechas seleccionadas. Por favor, verifica los conflictos y vuelve a intentarlo.");
    return;
  }

  const generatedBookings = selectedDates.value.map(date => {
    return {
      ...bookingInfo.value,
      dateFrom: getDayString(date),
      dateTo: getDayString(date),
      isSingle: repeatMode.value === 'none' && selectedDates.value.length === 1
    }
  });

  emit('update:dialog', false)
  emit('confirmBulkBooking', generatedBookings)
}

watch(() => props.dialog, async (val) => {
  dialog.value = val
  if (val && props.initialBooking) {
    isProgrammaticUpdate = true;
    bookingInfo.value = JSON.parse(JSON.stringify(props.initialBooking))
    repeatMode.value = 'none'
    verificationError.value = null
    if (bookingInfo.value.dateFrom) {
        const initialDateMoment = moment(bookingInfo.value.dateFrom);
        if (initialDateMoment.format('YYYY-MM-DD') !== today.value || isTodaySelectable.value) {
          selectedDates.value = [initialDateMoment.toDate()]
        } else {
          selectedDates.value = []
        }
    } else {
        selectedDates.value = []
    }
    await nextTick();
    isProgrammaticUpdate = false;
  }
})

watch(dialog, (val) => {
  emit('update:dialog', val)
})
</script>

<style scoped>
.fields { display: flex; flex-direction: column; gap: 14px }
.summary { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 10px; background: #f8f9fa; color: #334155; font-size: .875rem }
.summary i { color: #64748b }
.picker { border: 1px solid #e5e7eb; border-radius: 12px }
.error-box { border-radius: 10px; font-size: .85rem; white-space: pre-wrap }
</style>
