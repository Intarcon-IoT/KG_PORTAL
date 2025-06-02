<template>
  <div class="calendar-header">
    <div class="current-display">
      {{ displayDate }}
    </div>
    <button @click="$emit('previous')" class="nav-button">
      <i class="fa-solid fa-caret-left"></i>
    </button>
    <button @click="$emit('today')" class="nav-button today-button">Semana actual</button> 
    <button @click="$emit('next')" class="nav-button">
      <i class="fa-solid fa-caret-right"></i>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import moment from 'moment/min/moment-with-locales';
moment.locale('es');

const props = defineProps({
  selectedDate: Object,
});

defineEmits(['previous', 'next', 'today']);

const startOfWeek = computed(() => {
  return moment(props.selectedDate).startOf('week');
});

const endOfWeek = computed(() => {
  return moment(props.selectedDate).endOf('week');
});

const displayDate = computed(() => {
  const startMonth = startOfWeek.value.format('MMMM');
  const endMonth = endOfWeek.value.format('MMMM');
  const year = endOfWeek.value.format('YYYY');

  return startMonth === endMonth? `${startMonth} ${year}` : `${startMonth} - ${endMonth} ${year}`;
});
</script>

<style scoped>
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #eee;
  text-transform: capitalize;
}

.current-display {
  font-size: 1.3em;
  font-weight: bold;
  text-align: start;
  flex-grow: 1;
  margin: 0 10px;
}

.nav-button {
  background: none;
  border: none;
  font-size: 1.4em;
  cursor: pointer;
  padding: 0 8px;
  color: #333;
}

.today-button {
  font-size: 0.9em;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 3px 10px;
  margin: 0 10px;
  background-color: #fff;
}

.nav-button:hover, .today-button:hover {
  color: #007bff;
}

.today-button:hover {
  border-color: #007bff;
}
</style>