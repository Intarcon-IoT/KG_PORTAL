<template>
  <appDialog v-model="isOpen" eyebrow="Nueva reserva · Paso 3 de 4" title="Elige día y hora" :subtitle="bookingInfo.room?.name" :width="520" back @back="goBack">
    <div class="week-nav">
      <button type="button" class="nav-btn" aria-label="Semana anterior" @click="goToPreviousWeek"><i class="fa-solid fa-chevron-left" /></button>
      <span>{{ weekRangeText }}</span>
      <button type="button" class="nav-btn" aria-label="Semana siguiente" @click="goToNextWeek"><i class="fa-solid fa-chevron-right" /></button>
    </div>

    <div class="days" role="tablist" aria-label="Día">
      <button
        v-for="day in weekDays" :key="day.dateString" type="button" role="tab" class="day"
        :class="{ active: day.dateString === selectedDate, today: day.dateString === todayKey() }"
        :aria-selected="day.dateString === selectedDate" :disabled="day.isPast" @click="selectedDate = day.dateString"
      >
        <small>{{ day.shortName }}</small>
        <strong>{{ day.day }}</strong>
      </button>
    </div>

    <div ref="hoursRef" class="hours">
      <template v-for="hour in hours" :key="hour">
        <div v-if="hasOwnBooking(hour)" class="slot slot-own">
          <span class="slot-time">{{ hour }}</span>
          <span class="slot-state"><i class="fa-solid fa-user-check" /> Tu reserva</span>
        </div>
        <div v-else-if="hasApproved(hour)" class="slot slot-busy">
          <span class="slot-time">{{ hour }}</span>
          <span class="slot-state"><i class="fa-solid fa-lock" /> Ocupada</span>
        </div>
        <button v-else type="button" class="slot slot-free" :class="{ 'slot-pending': hasPendingFromOther(hour) }" :disabled="isHourPast(hour)" @click="selectHour(hour)">
          <span class="slot-time">{{ hour }}</span>
          <span v-if="hasPendingFromOther(hour)" class="slot-state">
            <i class="fa-solid fa-clock-rotate-left" /> Pendiente de aprobación
            <v-tooltip activator="parent" location="top">Otra persona tiene una reserva pendiente de validación en este tramo</v-tooltip>
          </span>
          <span v-else class="slot-state">{{ isHourPast(hour) ? 'Pasada' : 'Libre' }}</span>
          <i class="fa-solid fa-plus slot-add" />
        </button>
      </template>
    </div>
  </appDialog>
</template>

<script setup>
import appDialog from '@/components/app-dialog.vue'
import { toDateKey, todayKey, parseDateKey } from '@/utils/dates'
import { ref, watch, computed, onMounted, nextTick } from 'vue'
import Request from "@/model/request";
import { useNotificationStore, sessionStore } from '@/store';
import moment from 'moment';
import { BOOKING_STATUS } from '@/utils/constants';

const props = defineProps({ 
  dialog: Boolean,
  bookingInfo: Object, 
})

const emit = defineEmits([
  'update:dialog', 
  'next',
  'back'
])

const notificationStore = useNotificationStore();
const session = sessionStore();

const isOpen = ref()
const selectedDate = ref(props.bookingInfo.date);
const bookingsOnDay = ref([]);
const baseDate = ref(null);

const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

const weekDays = computed(() => {
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate.value)
    d.setDate(d.getDate() + i)

    const dateStr = toDateKey(d)
    const isPast = dateStr < todayKey()

    days.push({
      date: d,
      day: d.getDate(),
      shortName: d.toLocaleDateString('es-ES', { weekday: 'short' }),
      dateString: dateStr,
      isPast
    })
  }
  return days
})

const weekRangeText = computed(() => {
  const first = weekDays.value[0].date
  const last = weekDays.value[6].date
  const format = (d) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  return `${format(first)} - ${format(last)}`
})

// La lista de horas arranca en la hora actual si es hoy y a las 08:00 en otro día
const hoursRef = ref(null)
const scrollHours = () => nextTick(() => {
  const el = hoursRef.value
  const row = el?.children[selectedDate.value === todayKey() ? new Date().getHours() : 8]
  if (row) el.scrollTop = row.offsetTop
})

function goBack() {
  isOpen.value = false
  emit('back', props.bookingInfo.facility);
}

function goToPreviousWeek() {
  baseDate.value.setDate(baseDate.value.getDate() - 7)
  baseDate.value = new Date(baseDate.value)
}

function goToNextWeek() {
  baseDate.value.setDate(baseDate.value.getDate() + 7)
  baseDate.value = new Date(baseDate.value)
}

function selectHour(hour) {
  emit('update:dialog', false)
  emit('next', {
    date: selectedDate.value,
    time: hour
  })
}

async function updateBookingByDaySelectedList(day){

  const requestBookingByDay = new Request({
    endpoint: 'bookings',
    method: 'GET',
    params: {
      start_date: day,
      room_uuid: props.bookingInfo.room.uuid
    }
  });
  await requestBookingByDay.http().then(res => {
    bookingsOnDay.value = res;
  })
  .catch(err => notificationStore.notifyError(err.message))
}

function getBookingsForHour(hour) {
  if (!bookingsOnDay.value || bookingsOnDay.value.length === 0) {
    return [];
  }

  const startOfBlock = moment(hour, 'HH:mm');
  const endOfBlock = moment(hour, 'HH:mm').add(1, 'hour');

  return bookingsOnDay.value.filter(booking => {
    const bookingStart = moment(booking.start_time, 'HH:mm');
    const bookingEnd = moment(booking.end_time, 'HH:mm');
    return bookingStart.isBefore(endOfBlock) && bookingEnd.isAfter(startOfBlock);
  });
}

function hasOwnBooking(hour) {
  return getBookingsForHour(hour).some(b => b.user_uuid === session.auth.user.uuid);
}

function hasPendingFromOther(hour) {
  return getBookingsForHour(hour).some(b => b.user_uuid !== session.auth.user.uuid && b.status === BOOKING_STATUS.PENDING);
}

function hasApproved(hour) {
  return getBookingsForHour(hour).some(b => b.status === BOOKING_STATUS.APPROVED);
}

function isHourPast(hour) {
  const now = moment();
  const selected = moment(`${selectedDate.value} ${hour}`, 'YYYY-MM-DD HH:mm');
  return selected.isBefore(now);
}


watch(selectedDate, (val) => {
    updateBookingByDaySelectedList(val);
    scrollHours()
}) 

watch(() => props.dialog, (val) => {
  isOpen.value = val

  if (val) {
    const formattedDate = props.bookingInfo.date 
      ? moment(props.bookingInfo.date).format('YYYY-MM-DD')
      : moment().format('YYYY-MM-DD');

    selectedDate.value = formattedDate;
    setWeekFromDate(formattedDate);
    updateBookingByDaySelectedList(formattedDate);
    scrollHours()
  }
});

watch(isOpen, (val) => {
  if (val !== props.dialog) {
    emit('update:dialog', val);
  }

  if (!val) {
    bookingsOnDay.value = [];
  }
});

onMounted(() => {
  if (props.bookingInfo.date) {
    const formattedDate = moment(props.bookingInfo.date).format('YYYY-MM-DD');
    setWeekFromDate(formattedDate);
  } else {
    setWeekFromDate(null);
  }
});

function setWeekFromDate(dateString) {
  if (!dateString) {
    const today = new Date();
    const offset = today.getDay() === 0 ? -6 : 1 - today.getDay();
    baseDate.value = new Date(new Date(today).setDate(today.getDate() + offset));
  } else {
    const targetDate = parseDateKey(dateString);
    const dayOfWeek = targetDate.getDay();
    const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    baseDate.value = new Date(new Date(targetDate).setDate(targetDate.getDate() + offset));
  }
}
</script>

<style scoped>
.week-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-size: .875rem; font-weight: 600; color: #334155 }
.nav-btn { display: grid; place-items: center; width: 32px; height: 32px; border: 0; border-radius: 9px; background: transparent; color: #64748b; cursor: pointer }
.nav-btn:hover { background: #f1f2f4; color: #111111 }
.nav-btn:focus-visible, .day:focus-visible, .slot-free:focus-visible { outline: 2px solid #111111; outline-offset: 2px }

.days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-bottom: 16px }
.day { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 0; border: 1px solid #eceef2; border-radius: 10px; background: #ffffff; color: #111111; font: inherit; cursor: pointer; transition: border-color .15s, background-color .15s }
.day small { font-size: .7rem; color: #64748b; text-transform: capitalize }
.day strong { font-size: 1rem; font-weight: 600 }
.day:hover:not(:disabled) { border-color: #cbd5e1 }
.day.today { border-color: #468131 }
.day.today small { color: #468131 }
.day.active { border-color: #111111; background: #111111; color: #ffffff }
.day.active small { color: rgba(255, 255, 255, .7) }
.day:disabled { opacity: .35; cursor: not-allowed }

.hours { position: relative; display: flex; flex-direction: column; gap: 6px; max-height: 340px; overflow-y: auto; padding-right: 4px; scrollbar-width: thin }
.slot { display: flex; align-items: center; gap: 14px; width: 100%; min-height: 44px; padding: 0 14px; border: 1px solid #eceef2; border-radius: 10px; background: #ffffff; color: #111111; font: inherit; font-size: .875rem; text-align: left }
.slot-time { width: 44px; font-weight: 600; font-variant-numeric: tabular-nums }
.slot-state { display: flex; flex: 1; align-items: center; gap: 6px; color: #64748b; font-size: .8rem }
.slot-state i { font-size: .75rem }
.slot-add { font-size: .75rem; color: #94a3b8 }

.slot-free { cursor: pointer; transition: border-color .15s, background-color .15s }
.slot-free:hover:not(:disabled) { border-color: #111111 }
.slot-free:hover:not(:disabled) .slot-add { color: #111111 }
.slot-free:disabled { background: #fafafb; opacity: .5; cursor: not-allowed }
.slot-pending .slot-state { color: #b45309 }
.slot-own { border-color: #d7e6cf; background: #f1f5ee }
.slot-own .slot-state { color: #33662d; font-weight: 600 }
.slot-busy { background: #fafafb }
.slot-busy .slot-state { color: #b91c1c; font-weight: 600 }

@media (width < 600px) { .days { gap: 4px } }
</style>
