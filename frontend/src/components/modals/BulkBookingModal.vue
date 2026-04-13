<template>
  <v-dialog v-model="dialog" max-width="600" transition="dialog-bottom-transition" persistent>
    <v-card class="pa-4 rounded-xl">
      <v-card-title class="d-flex align-center position-relative text-subtitle-1 font-weight-medium text-grey-darken-3">
        <i class="fa-solid fa-arrow-left position-absolute start-5 fa-lg back-icon" @click="goBack"></i>
        <div class="w-100 text-center">Repetir Reserva</div>
        <i class="fa-solid fa-xmark position-absolute fa-lg close-icon" @click="cancelAndClose"></i>
      </v-card-title>
      
      <v-card-text class="dialog-content">
        <v-container>
          <div class="mb-4 text-center">
            <p class="text-body-2 text-grey-darken-1">
              {{ bookingInfo?.title }} ({{ bookingInfo?.timeFrom }} - {{ bookingInfo?.timeTo }})
            </p>
          </div>
          
          <v-row>
            <v-col cols="12">
              <v-select
                v-model="repeatMode"
                :items="repeatOptions"
                label="Frecuencia"
                @update:modelValue="onRepeatModeChange"
              />
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12" class="px-0 py-2 d-flex justify-center">
              <v-date-picker
                v-model="selectedDates"
                multiple
                title="Fechas a reservar"
                elevation="0"
                :min="today"
                :allowed-dates="allowedDates"
                width="100%"
                class="rounded-lg"
                show-adjacent-months
              ></v-date-picker>
            </v-col>
          </v-row>
          
          <v-row v-if="verificationError" class="mt-2">
            <v-col cols="12">
              <v-alert type="error" variant="tonal" icon="fa-solid fa-triangle-exclamation" style="white-space: pre-wrap;">
                {{ verificationError }}
              </v-alert>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      
      <v-card-actions>
        <v-spacer />
        <v-btn
          color="primary"
          @click="confirmBulkReservation"
          class="confirm-btn"
          :loading="isVerifying"
          :disabled="selectedDates.length === 0"
        >
          Confirmar Reserva{{ selectedDates.length > 1 ? 's' : '' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import { useNotificationStore, sessionStore, useBookingStore } from '@/store';
import moment from 'moment';

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
const today = new Date().toISOString().substring(0, 10);
const isTodaySelectable = computed(() => {
  if (!bookingInfo.value?.timeFrom) return true;
  const now = moment();
  const todayTime = moment(`${today} ${bookingInfo.value.timeFrom}`, 'YYYY-MM-DD HH:mm');
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
  if (dateStr === today) {
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
  
  if (originalDate.format('YYYY-MM-DD') !== today || isTodaySelectable.value) {
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
          if (dStr === today && !isTodaySelectable.value) continue;
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
        if (dStr === today && !isTodaySelectable.value) continue;
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
        if (dStr === today && !isTodaySelectable.value) {
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

watch(selectedDates, (newVal, oldVal) => {
  if (isProgrammaticUpdate) return;

  if (!isTodaySelectable.value) {
    const todayIndex = newVal.findIndex(d => getDayString(d) === today);
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
                  if (b.status === 'Approved' || (b.status === 'Pending' && b.user_uuid === session.auth.user.uuid)) {
                    return true;
                  }
                } else {
                  if (b.status === 'Approved' || b.status === 'Pending') {
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

    if (datesFormatted.includes(today) && !isTodaySelectable.value) {
        throw new Error(`La hora de la reserva ya ha pasado para el día de hoy (${moment(today).format('DD-MM-YYYY')})`);
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
        if (initialDateMoment.format('YYYY-MM-DD') !== today || isTodaySelectable.value) {
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
  border-radius: 12px;
}

.dialog-content {
  max-height: 600px;
  overflow-y: auto;
}
</style>
