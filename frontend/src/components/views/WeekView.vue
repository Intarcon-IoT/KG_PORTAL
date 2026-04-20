<template>

  <div class="week-view">
    
    <!-- CABECERA: dias de la semana -->
    <div class="header-row">
      <div class="resource-header">Salas</div> 
      <div 
        v-for="day in weekDays" 
        :key="day.date.toISOString()" 
        class="day-header"
        :class="{ 'today-header': isToday(day.date)}"
      >
        <span class="weekday-name">{{ day.shortName }}</span>
          <span 
            class="day-number"
            :class="{ 'today-number': isToday(day.date) }"
          >
            {{ day.dayNumber }}
          </span>
      </div>
    </div>

    <!-- FILAS -->
    <div class="resource-grid">
      <div
        v-for="facility in selectedFacilities"
        :key="facility.uuid"
      >
        <div 
          v-for="room in selectedRooms.filter(room => room.facility_uuid === facility.uuid)"
          :key="room.uuid"
          class="resource-line"
        >
          <div class="resource-cell">
            <div 
              v-if="room.needsValidation == 1"
              class="validation-badge"
            >
              <v-tooltip
                activator="parent"
                location="end"
              >
                Las reservas en esta sala necesitan ser aprobadas por un administrador
              </v-tooltip>
              <i class="fa-solid fa-circle-exclamation"></i>
            </div>
            <div 
              class="capacity-badge" 
              :style="{ backgroundColor: `${facility.color}` }"
            >
              <v-tooltip
                activator="parent"
                location="end"
              >
                Aforo máximo: {{room.capacity}}
              </v-tooltip>
              {{ room.capacity }}
            </div>
            <div class="room-info">
              <span class="resource-name">{{ room.name }}</span>
              <span class="resource-building">{{ facility.name }}</span>
            </div>
          </div>
          <!-- RESERVAS -->
          <div class="resource-row">
            <div
              v-for="day in weekDays"
              :key="day.date.toISOString()"
              class="day-cell"
              :class="{ 'past-day': isPastDay(day.date) }"
              :style="{ minHeight: `${getEventsForResourceAndDay(room.uuid, day.date).length * 30 + 40}px` }"
              @click="() => !isPastDay(day.date) && emit('empty_cell_click', room, day.date)"
            >
              <div
                v-for="event in getEventsForResourceAndDay(room.uuid, day.date)"
                :key="event.uuid"
                :style="{ backgroundColor: `${facility.color}` }"
                class="event-chip"
                :class="{ 
                  'past-event': isPastDay(day.date), 
                  'pending-event': event.status === BOOKING_STATUS.PENDING && !isPastDay(day.date) 
                }"
                @click.stop="() => emit('booking_click', event, resource, isPastDay(day.date))"
              >
                <v-tooltip
                  activator="parent"
                  location="end"
                  class="custom-tooltip"
                  max-width="300"
                >
                  <div class="tooltip-content">
                    <div v-if="event.status === BOOKING_STATUS.PENDING && !isPastDay(day.date)" class="tooltip-status mb-2">
                      <i class="fa-solid fa-clock-rotate-left mr-1"></i> Reserva pendiente de validación
                    </div>
                    <div class="tooltip-title">{{ event.title }}</div>
                    <div class="tooltip-time">{{ formatTime(event.start_time) }} - {{ formatTime(event.end_time) }}</div>
                  </div>
                </v-tooltip>
                <i v-if="event.status === BOOKING_STATUS.PENDING && !isPastDay(day.date)" class="fa-solid fa-clock-rotate-left mr-1 event-status-icon"></i>
                {{ formatTime(event.start_time) }} - {{ formatTime(event.end_time) }}
                <br />
                {{ event.title }}
              </div>
              <div class="add-icon" v-if="!isPastDay(day.date)">+</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { BOOKING_STATUS } from '@/utils/constants';

const props = defineProps({
  selectedDate: Date,
  selectedFacilities: Array,
  selectedRooms: Array,
  bookingsList: Array,
});


const emit = defineEmits(['booking_click', 'empty_cell_click']);

// Calcular los días de la semana actual
const weekDays = computed(() => {
  const startOfWeek = new Date(props.selectedDate);
  const dayOfWeek = startOfWeek.getDay(); 
  const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Ajustar a Lunes
  startOfWeek.setDate(diff);

  const days = [];
  const optionsShort = { weekday: 'short' };
  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(startOfWeek);
    currentDay.setDate(startOfWeek.getDate() + i);
    days.push({
      date: currentDay,
      shortName: currentDay.toLocaleDateString('es-ES', optionsShort),
      dayNumber: currentDay.getDate(),
    });
  }
  return days;
});

const today = new Date();
today.setHours(0, 0, 0, 0);

function isToday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime() === today.getTime();
}

function isPastDay(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
}

// Filtrar eventos para una sala y día específicos
function getEventsForResourceAndDay(resourceId, date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return props.bookingsList.filter(event => {
      const eventDate = new Date(event.start_date);
      return ( 
        event.room_uuid === resourceId &&
        eventDate >= dayStart &&
        eventDate <= dayEnd
      );
    }).sort((a, b) => a.start_time.localeCompare(b.start_time));
}

function formatTime(time) {
  if (!time) return '';
  if (typeof time === 'string') {
    const [hour, minute] = time.split(':');
    return `${hour}:${minute}`;
  }
  return time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
}

</script>

<style scoped>
.week-view {
  display: flex;
  flex-direction: column;
  border-top: 1px solid #eee;
  overflow: auto;
}

.header-row {
  display: flex;
  border-bottom: 1px solid #ccc;
  background-color: #f8f8f8;
  flex-shrink: 0;
}

.today-number {
  border: 2px solid #007bff;
  border-radius: 50px;
  padding: 4px 8px;
  color: #ffffff;
  background-color: #007bff;
  font-weight: bold;
  display: inline-block;
  min-width: 28px;
  text-align: center;
  line-height: 1;
  user-select: none;
}

.resource-header {
  width: 200px;
  padding: 10px;
  border-right: 1px solid #ccc;
  font-weight: bold;
  flex-shrink: 0;
}

.day-header {
  flex: 1;
  text-align: center;
  padding: 5px;
  border-left: 1px solid #eee;
}
.day-header .weekday-name {
  display: block;
  font-size: 0.8em;
  color: #666;
}
.day-header .day-number {
  font-size: 1.1em;
  font-weight: bold;
}

.resource-column {
  width: 200px;
  border-right: 1px solid #ccc;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;
}

.resource-cell {
  width: 200px;
  padding: 10px;
  border-right: 1px solid #ccc;
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.custom-tooltip .v-overlay__content {
  max-width: 300px !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
  white-space: normal !important;
}

.tooltip-content {
  padding: 4px;
}

.tooltip-title {
  font-weight: bold;
  word-break: break-word;
  max-width: 100%;
  line-height: 1.3;
  margin-bottom: 4px;
}

.tooltip-time {
  font-size: 0.9em;
  opacity: 0.9;
}

.capacity-badge {
  position: absolute;
  top: 5px;
  right: 5px;
  color: white;
  font-size: 0.75rem;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.validation-badge {
  position: absolute;
  top: 7px;
  right: 48px;
  color: #d32f2f;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: help;
}

.room-info {
  display: flex;
  flex-direction: column;
  padding-right: 30px;
}

.resource-name {
  display: block;
  font-weight: bold;
  font-size: 0.9em;
  margin-bottom: 3px;
}

.resource-building {
  display: block;
  font-size: 0.8em;
  color: #666;
}

.resource-row:last-child {
    border-bottom: none;
}

.day-cell:first-child {
    border-left: none;
}

.event-chip {
  background-color: #007bff;
  color: white;
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 0.8em;
  margin-bottom: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  z-index: 1;
  position: relative;
}

.event-chip:hover {
    opacity: 0.8;
}

.pending-event {
  opacity: 0.6;
}

.event-status-icon {
  font-size: 0.9em;
}

.tooltip-status {
  font-weight: bold;
  color: #fb8c00;
  font-size: 0.85em;
  display: flex;
  align-items: center;
}

.resource-grid {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-grow: 1;
}

.resource-line {
  display: flex;
  flex-direction: row;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.resource-cell {
  width: 200px;
  padding: 10px;
  border-right: 1px solid #ccc;
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.resource-row {
  display: flex;
  flex-grow: 1;
}

.day-cell {
  flex: 1;
  padding: 5px;
  padding-bottom: 24px;
  border-left: 1px solid #eee;
  position: relative;
  overflow: hidden;
  min-height: 60px;
  cursor: pointer;
}

.event-list {
  max-height: 100%;
  overflow-y: auto;
}

.add-icon {
  position: absolute;
  bottom: 2px;
  right: 6px;
  font-size: 16px;
  color: #007bff;
  background: #c1dfff;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  text-align: center;
  line-height: 20px;
  box-shadow: 0 0 2px rgba(0,0,0,0.2);
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
  z-index: 2;
}

.day-cell:hover .add-icon {
  opacity: 1;
}

.past-event {
  opacity: 0.7;
  cursor: default;
}

.past-day {
  background-image: repeating-linear-gradient(
    -45deg,
    rgba(224, 224, 224, 0.5) 1px,
    rgba(224, 224, 224, 0.5) 1px,
    rgba(250, 250, 250, 0.1) 4px,
    rgba(250, 250, 250, 0.1) 15px
  );
  background-color: rgba(250, 250, 250, 0.9);
  background-attachment: fixed;
  background-position: 0 0;
  opacity: 1;
  cursor: default;
}

.past-day:hover .add-icon {
  opacity: 0;
}

.past-day .event-chip {
  opacity: 0.7;
  cursor: default;
}
</style>
