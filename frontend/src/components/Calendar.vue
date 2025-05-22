<template>
  <div class="calendar-layout">
    <div class="sidebar">
      <v-card flat class="pa-2">
        <MiniMonthView 
          :selected-date="selectedDate"
          @dateSelected="selectedDate = $event"
          @previous="navigatePrevious"
          @next="navigateNext"
        />
      </v-card>
      <!-- <v-card flat class="pa-2 mt-4">
        <CalendarViewSelector
          v-model="currentView"
          :options="viewOptions"
        />
      </v-card> -->
      <v-card flat class="pa-2 mt-4">
        <ResourceFilter
          :roomsList="roomsList"
          :installationsList="installationsList"
          @update:selectedFacilitiesUuid="handlerSelectedFacilitiesFilter"
        />
        <!-- selectedBuildingIds -->
      </v-card>
      <v-card flat class="pa-2 mt-4">
        <UserOnlySwitch v-model="showOnlyMine" />
      </v-card>
    </div>
    <div class="main-content">
      <CalendarHeader
        :view="currentView"
        @previous="navigatePrevious"
        @next="navigateNext"
        @today="goToToday"
      />
      <div class="calendar-body">
        <!-- <DayView
          v-if="currentView === 'day'"
          :selected-date="selectedDate"
          :resources="filteredResources"
          :events="allEvents"
        /> -->
        <WeekView
          v-if="currentView === 'week'"
          :selected-date="selectedDate"
          :selectedFacilities="selectedFacilities"
          :selectedRooms="selectedRooms"
          :bookingsList="bookingsList"
          @booking_click="handleBookingDetailsView"
          @empty_cell_click="handleNewBookingFromCalendar"
        />
        <!-- <MonthView
          v-if="currentView === 'month'"
          :selected-date="selectedDate"
          :year="selectedDate.getFullYear()"
          :month="selectedDate.getMonth()"
          @date-selected="selectDateAndSwitchView"
          :resources="filteredResources"
          :events="allEvents"
        /> -->
      </div>
      <v-btn
        class="fab-add-event"
        icon
        color="primary"
        @click="showFacilityModal = true"
        elevation="6"
      >
        <i class="fa-solid fa-plus"></i>
      </v-btn>
      <FacilitySelectionModal 
        v-model:dialog="showFacilityModal"
        :installations="installationsList"
        @next="handleSelectedFacility"
      />
      <RoomSelectionModal
        v-model:dialog="showRoomModal"
        :rooms="availableRooms"
        @next="handleRoomSelected"
        @back="handleBackToFacilityModal"
      />
      <DateSelectionModal
        v-model:dialog="showDateModal"
        :booking="bookingsList"
        :selectedRoom="booking.room"
        :bookingInfo="booking"
        @next="handleDateSelected"
        @back="handleBackToRoomModal"
      />
      <DetailsSelectionModal
        v-model:dialog="showDetailsModal"
        :booking="booking"
        :bookingsList="bookingsList"
        :installations="installationsList"
        :rooms="roomsList"
        @back="handleBackToDateModal"
        @confirmBooking="handleBooking"
      />
      <ViewBookingDetailsModal
        v-model:dialog="showBookingDetailsModal"
        :booking="bookingDetails"
        :rooms="roomsList"
        :facilities="installationsList"
        @delete="deleteBooking"
      />
    </div>
  </div>
</template>

<script setup>
import CalendarHeader from './calendar-navigation/CalendarHeader.vue';
import MonthView from './views/MonthView.vue';
import WeekView from './views/WeekView.vue';
import DayView from './views/DayView.vue';
import MiniMonthView from './views/MiniMonthView.vue';
import FacilitySelectionModal from './modals/FacilitySelectionModal.vue';
import RoomSelectionModal from './modals/RoomSelectionModal.vue';
import DateSelectionModal from './modals/DateSelectionModal.vue';
import DetailsSelectionModal from './modals/DetailsSelectionModal.vue';
import ViewBookingDetailsModal from './modals/ViewBookingDetailsModal.vue';
import ResourceFilter from './filters/ResourceFilter.vue';
import CalendarViewSelector from './calendar-navigation/CalendarViewSelector.vue';
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import UserOnlySwitch from './filters/UserOnlySwitch.vue';
import Request from "@/model/request";
import { useNotificationStore,sessionStore } from '@/store';
import { fa } from 'vuetify/locale';

// SHOW MODALS
const showFacilityModal = ref(false);
const showRoomModal = ref(false);
const showDateModal = ref(false);
const showDetailsModal = ref(false);
const showBookingDetailsModal = ref(false);
const showEditModal = ref(false);

// DATA
const installationsList = ref([]);
const roomsList = ref([]);
const bookingsList = ref([]);

// MODALS DATA
const availableRooms = ref([]);
const bookingDetails = ref(null);
const selectedEditBooking = ref(null);
const isEditingMode = ref(false);

// STORE
const notificationStore = useNotificationStore();
const session = sessionStore();

//FILTER DATA
const selectedFacilitiesUuid = ref([]);
const selectedFacilities = computed(() => {
  return installationsList.value.filter(facility =>
    selectedFacilitiesUuid.value.includes(facility.uuid)
  );
});
const selectedRooms = computed(() => {
  return roomsList.value.filter(room =>
    selectedFacilitiesUuid.value.includes(room.facility_uuid)
  );
});
const showOnlyMine = ref(false);

// CALENDAR NAVIGATION
const todayDate = new Date();
todayDate.setHours(0, 0, 0, 0);
const tomorrowDate = new Date(todayDate);
tomorrowDate.setDate(todayDate.getDate() + 1);
const dayAfterTomorrowDate = new Date(todayDate);
dayAfterTomorrowDate.setDate(todayDate.getDate() + 2);

const currentView = ref('week');
const selectedDate = ref(new Date());

// OBJETO RESERVA TEMPORAL
const booking = reactive({
  facility: null,
  room: null,
  date: null,
  time: null,
});


onMounted(async () => {

  const requestFacilities = new Request({
    endpoint: 'facilities',
    method: 'GET'
  });
  await requestFacilities.http().then(res => {
    installationsList.value = res.sort((a, b) => a.name.localeCompare(b.name));;
  })
  .catch(err => notificationStore.notifyError(err.message))

  const requestRooms = new Request({
    endpoint: 'rooms',
    method: 'GET'
  });
  await requestRooms.http().then(res => {
    roomsList.value = res;
  })
  .catch(err => notificationStore.notifyError(err.message))

  loadBookings();
});

async function loadBookings() {
    const request = new Request({
      endpoint: 'bookings',
      method: 'GET'
    });

    await request.http().then(res => {
      bookingsList.value = res;
    })
    .catch(err => notificationStore.notifyError(err.message))
}

// HANDLERS
function handleNewBookingFromCalendar(room, date) {
  booking.facility = installationsList.value.find(facility => facility.uuid === room.facility_uuid);
  booking.room = room;
  booking.date = date;
  showDateModal.value = true;
}

function handlerSelectedFacilitiesFilter(selectedFacilitiesArray) {
  selectedFacilitiesUuid.value = selectedFacilitiesArray;
}

function handleSelectedFacility(facility) {
  booking.facility = facility;
  availableRooms.value = roomsList.value.filter(room => room.facility_uuid === facility.uuid);

  showFacilityModal.value = false
  showRoomModal.value = true
}

function handleBackToFacilityModal() {
  showRoomModal.value = false
  showFacilityModal.value = true
}

function handleRoomSelected(room) {
  booking.room = room;
  booking.date = null;

  showRoomModal.value = false
  showDateModal.value = true
}

function handleBackToRoomModal() {
  showDateModal.value = false
  showRoomModal.value = true
}

function handleDateSelected(date) {
  booking.date = date.date;
  booking.time = date.time;

  showDetailsModal.value = true;
}

function handleBackToDateModal() {
  showBookingDetailsModal.value = false
  showDateModal.value = true
}

function handleBookingDetailsView(booking, room) {
  showBookingDetailsModal.value = true;
  bookingDetails.value = booking;
}

function handleBooking(bookingData) {
  const newBooking = {
    room_uuid: bookingData.room_uuid,
    start_date: bookingData.dateFrom,
    end_date: bookingData.dateTo,
    start_time: bookingData.timeFrom,
    end_time: bookingData.timeTo,
    title: bookingData.title,
    details: bookingData.details
  };

  saveBooking(newBooking);
  notificationStore.notifySuccess('Reserva creada con éxito');
}

async function saveBooking(newBooking) {
  const request = new Request({
    endpoint: 'bookings',
    method: 'POST',
    body: JSON.stringify(newBooking),
  });

  await request.http().then(res => {
    loadBookings();
  })
  .catch(err => notificationStore.notifyError(err.message))
}

// function editBooking(booking) {
//   selectedEditBooking.value = booking;
//   isEditingMode.value = true;
//   showEditModal.value = true;
// }

// const updateBooking = async (updatedBooking) => {
//   try {
//     const request = new Request({
//       endpoint: `bookings/${updatedBooking.uuid}`,
//       method: 'PUT',
//       body: JSON.stringify(updatedBooking)
//     });
    
//     await request.http();
//     notificationStore.notifySuccess('Reserva actualizada con éxito');
//     loadBookings();
//   } catch (error) {
//     console.error('Error al actualizar la reserva:', error);
//     notificationStore.notifyError('Error al actualizar la reserva');
//   }
// }

const deleteBooking = async (bookingId) => {
  try {
    // Llamada a tu API para eliminar la reserva usando Request
    const request = new Request({
      endpoint: `bookings/${bookingId}`,
      method: 'DELETE'
    });

    await request.http();
    notificationStore.notifySuccess('Reserva eliminada con éxito');
    loadBookings();
  } catch (error) {
    console.error('Error al eliminar la reserva:', error);
    notificationStore.notifyError('Error al eliminar la reserva');
  }
}

// NAVIGATION
function navigatePrevious() {
  const d = new Date(selectedDate.value); 
  if (currentView.value === 'month') {
    d.setMonth(d.getMonth() - 1);
  } else if (currentView.value === 'week') {
    d.setDate(d.getDate() - 7);
  } else {
    d.setDate(d.getDate() - 1);
  }
  selectedDate.value = new Date(d);
}

function navigateNext() {
  const d = new Date(selectedDate.value);
  if (currentView.value === 'month') {
    d.setMonth(d.getMonth() + 1);
  } else if (currentView.value === 'week') {
    d.setDate(d.getDate() + 7);
  } else {
    d.setDate(d.getDate() + 1);
  }
  selectedDate.value = new Date(d);
}

function goToToday() {
  selectedDate.value = new Date();
}

// function selectDateAndSwitchView(date) {
//   selectedDate.value = new Date(date);
//   currentView.value = 'day';
// }

watch(showOnlyMine, (val) => {
  if (val) {
    bookingsList.value = bookingsList.value.filter(booking => booking.user_uuid === session.auth.user.uuid);
  } else {
    loadBookings();
  }
});
</script>

<style scoped>
.calendar-layout {
  display: flex;
  height: 100%;
  width: 100%;
  max-width: none;
  border: none;
  border-radius: 0;
  box-shadow: none;
  font-family: sans-serif;
  background-color: #ffffff;
}

.sidebar {
  width: 240px;
  flex-shrink: 0;
  border-right: 1px solid #ccc;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  padding: 15px 0px;
  height: 100%;
}

.main-content {
  flex-grow: 1; 
  display: flex;
  flex-direction: column;
  height: 100%;
}

.calendar-body {
  flex-grow: 1;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.fab-add-event {
  position: fixed;
  bottom: 60px;
  right: 30px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: #007bff;
  color: white;
  border: none;
  font-size: 2em;
  line-height: 56px;
  text-align: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  z-index: 999;
  transition: background-color 0.2s ease;
}
</style>
