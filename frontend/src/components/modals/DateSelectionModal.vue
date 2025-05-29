<template>
  <v-dialog v-model="dialog" max-width="500" transition="dialog-bottom-transition" persistent>
    <v-card class="pa-4 rounded-xl">
      <v-card-title class="d-flex align-center position-relative text-subtitle-1 font-weight-medium text-grey-darken-3">
        <i class="fa-solid fa-arrow-left position-absolute start-5 fa-lg back-icon" @click="goBack"></i>
        <div class="w-100 text-center">Selecciona día y hora</div>
        <i class="fa-solid fa-xmark position-absolute fa-lg close-icon" @click="dialog = false"></i>
      </v-card-title>
      <v-card-text>
        <div class="d-flex justify-center align-center mb-3">
          <v-btn icon variant="text" @click="goToPreviousWeek">
            <i class="fa-solid fa-chevron-left"></i>
          </v-btn>
          <span class="text-caption text-grey-darken-1 font-weight-medium">
            {{ weekRangeText }}
          </span>
          <v-btn icon variant="text" @click="goToNextWeek">
            <i class="fa-solid fa-chevron-right"></i>
          </v-btn>
        </div>
        <div class="d-flex justify-space-around mb-5">
          <div
            v-for="day in weekDays"
            :key="day.dateString"
            class="text-center"
          >
            <div class="text-caption text-grey-darken-1">{{ day.shortName }}</div>
            <v-btn
              :color="day.dateString === selectedDate ? 'primary' : 'grey-lighten-3'"
              :variant="day.dateString === selectedDate ? 'flat' : 'text'"
              :disabled="day.isPast"
              class="elevation-0 mt-1"
              rounded
              size="small"
              @click="selectedDate = day.dateString"
            >
              <span :class="day.dateString === selectedDate ? 'text-white' : 'text-grey-darken-3'">
                {{ day.day }}
              </span>
            </v-btn>
          </div>
        </div>
        <div class="hour-scroll">
          <div
            v-for="hour in hours"
            :key="hour"
            class="hour-block"
           
          >
          <v-container>
            <v-row>
              <v-col cols="3" class="hour-cel">
                <div class="hour-text">{{ hour }}</div>
              </v-col>
              <v-col v-if="!isBooked(hour)" cols="9" class="booking-cell d-flex justify-center">
                <v-btn
                  class="select-hour-btn"
                  icon
                  color="primary"
                  @click="selectHour(hour)"
                  elevation="6"
                >
                  <i class="fa-solid fa-plus fa-xs"></i>
                </v-btn>
              </v-col>
              <v-col v-else cols="9" class="booking-cell d-flex justify-center align-center">
                <div class="reserved-badge">
                  <v-icon icon="mdi-calendar-alert" color="error" size="small" class="mr-1"></v-icon>
                  <span class="text-error font-weight-bold">RESERVADO</span>
                </div>
              </v-col>
            </v-row>
          </v-container>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import Request from "@/model/request";
import { useNotificationStore } from '@/store';
import moment from 'moment';

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

const dialog = ref();
const selectedDate = ref(props.bookingInfo.date);
const bookingsOnDay = ref([]);

const today = new Date();
const offset = today.getDay() === 0 ? -6 : 1 - today.getDay();
const baseDate = ref(new Date(today.setDate(today.getDate() + offset)));

const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

const weekDays = computed(() => {
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate.value)
    d.setDate(d.getDate() + i)

    const dateStr = d.toISOString().substring(0, 10)
    const isPast = new Date(dateStr) < new Date(new Date().toISOString().substring(0, 10))

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

function goBack() {
  emit('update:dialog', false)
  emit('back')
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

function isBooked(hour) {
  if (!bookingsOnDay.value || bookingsOnDay.value.length === 0) {
    return false;
  }

  const startOfBlock = moment(hour, 'HH:mm');
  const endOfBlock = moment(hour, 'HH:mm').add(1, 'hour');

  return bookingsOnDay.value.some(booking => {
    const bookingStart = moment(booking.start_time, 'HH:mm:ss');
    const bookingEnd = moment(booking.end_time, 'HH:mm:ss');

    return bookingStart.isBefore(endOfBlock) && bookingEnd.isAfter(startOfBlock);
  });
}

watch(selectedDate, (val) => {
    updateBookingByDaySelectedList(val);
}) 

watch(() => props.dialog, (val) => {
  dialog.value = val
})

watch(dialog, (val) => {
  emit('update:dialog', val);

  if (val && props.bookingInfo?.date) {
    const formattedDate = moment(props.bookingInfo.date).format('YYYY-MM-DD');
    selectedDate.value = formattedDate;
    updateBookingByDaySelectedList(formattedDate);
  }

  if (val && !props.bookingInfo?.date) {
    selectedDate.value = moment().format('YYYY-MM-DD');
    updateBookingByDaySelectedList(moment().format('YYYY-MM-DD'));
  }

  if (!val) {
    bookingsOnDay.value = [];
    selectedDate.value = null;
  }
});
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
  color:#24008f;
}

.hour-scroll {
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-right: 6px;
  border-radius: 12px;
}

.hour-block {
  display: block;
  margin: 0;
  padding: 0;
  height: 60px; 
  border-bottom: 1px solid #e0e0e0;
}

.hour-block:last-child {
  border-bottom: none;
}

.booking-cell {
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  cursor: pointer;
}

.select-hour-btn {
  width: 25px;
  height: 25px;
  border-radius: 50%;
  background-color: #007bff;
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1em;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  z-index: 999;
  transition: background-color 0.2s ease;
}

.select-hour-btn i {
  font-size: 12px;
}

.reserved-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffebee;
  border-left: 3px solid #f44336;
  padding: 4px 12px;
  border-radius: 4px;
  width: 100%;
  max-width: 160px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
  transition: transform 0.2s ease;
}

.reserved-badge:hover {
  transform: scale(1.02);
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}
</style>
