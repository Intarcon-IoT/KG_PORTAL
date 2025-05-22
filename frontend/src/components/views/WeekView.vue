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
              :style="{ minHeight: `${getEventsForResourceAndDay(room.uuid, day.date).length * 30 + 40}px` }"
              @click="() => emit('empty_cell_click', room, day.date)"
            >
              <div
                v-for="event in getEventsForResourceAndDay(room.uuid, day.date)"
                :key="event.uuid"
                :style="{ backgroundColor: `${facility.color}` }"
                class="event-chip"
                @click.stop="() => emit('booking_click', event, resource)"
              >
                <v-tooltip
                  activator="parent"
                  location="end"
                >
                  {{event.title}} ({{formatTime(event.start_time)}} - {{formatTime(event.end_time)}})
                </v-tooltip>
                {{ formatTime(event.start_time) }} - {{ formatTime(event.end_time) }}
                <br />
                {{ event.title }}
              </div>
              <div class="add-icon">+</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

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
</style>
