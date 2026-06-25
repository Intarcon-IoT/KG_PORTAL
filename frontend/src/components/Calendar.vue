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
          v-if="installationsList.length > 0" 
          :installationsList="installationsList"
          @update:selectedFacilitiesUuid="handlerSelectedFacilitiesFilter" 
        />
        <!-- selectedBuildingIds -->
      </v-card>
      <v-card flat class="pa-2 mt-4">
        <UserOnlySwitch 
          v-model="showOnlyMine" 
        />
      </v-card>
    </div>
    <div class="main-content">
      <CalendarHeader 
        :view="currentView" 
        :selectedDate="selectedDate" 
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
          :bookingsList="filteredBookings" 
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
        icon color="primary" 
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
        :isEditMode="isEditingMode"
        @back="handleBackToDateModal"
        @next="handleNextToBulkModal"
        @confirmBooking="handleBooking"
        @cancelEdit="handleCancelEdit"
      />
      <BulkBookingModal
        v-model:dialog="showBulkModal"
        :initialBooking="bookingPayload"
        @back="handleBackToDetailsModal"
        @confirmBulkBooking="handleBulkBooking"
      />
      <ViewBookingDetailsModal 
        v-model:dialog="showBookingDetailsModal"
        :booking="bookingDetails"
        :rooms="roomsList"
        :facilities="installationsList"
        @edit="handleEditBooking"
        @delete="deleteBooking"
        @status-update="handleBookingStatusUpdate"
      />
    </div>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import CalendarHeader from './calendar-navigation/CalendarHeader.vue';
import MonthView from './views/MonthView.vue';
import WeekView from './views/WeekView.vue';
import DayView from './views/DayView.vue';
import MiniMonthView from './views/MiniMonthView.vue';
import FacilitySelectionModal from './modals/FacilitySelectionModal.vue';
import RoomSelectionModal from './modals/RoomSelectionModal.vue';
import DateSelectionModal from './modals/DateSelectionModal.vue';
import DetailsSelectionModal from './modals/DetailsSelectionModal.vue';
import BulkBookingModal from './modals/BulkBookingModal.vue';
import ViewBookingDetailsModal from './modals/ViewBookingDetailsModal.vue';
import ResourceFilter from './filters/ResourceFilter.vue';
import CalendarViewSelector from './calendar-navigation/CalendarViewSelector.vue';
import { ref, reactive, computed, watch, onMounted } from 'vue';

const formatDate = (d) => d.toISOString().split('T')[0];

function getWeekRange(date) {
  const start = new Date(date);
  const day = start.getDay();
  start.setDate(start.getDate() - day + (day === 0 ? -6 : 1)); // lunes
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { from_date: formatDate(start), to_date: formatDate(end) };
}
import UserOnlySwitch from './filters/UserOnlySwitch.vue';
import { useNotificationStore, sessionStore, useBookingStore, useFacilityStore, useRoomStore } from '@/store';

// SHOW MODALS
const showFacilityModal = ref(false);
const showRoomModal = ref(false);
const showDateModal = ref(false);
const showDetailsModal = ref(false);
const showBulkModal = ref(false);
const showBookingDetailsModal = ref(false);

// STORE
const notificationStore = useNotificationStore();
const session = sessionStore();
const bookingStore = useBookingStore();
const facilityStore = useFacilityStore();
const roomStore = useRoomStore();

// DATA (from stores)
const { facilities: installationsList } = storeToRefs(facilityStore);
const { rooms: roomsList } = storeToRefs(roomStore);
const { bookings: bookingsList } = storeToRefs(bookingStore);

// MODALS DATA
const availableRooms = ref([]);
const bookingDetails = ref(null);
const isEditingMode = ref(false);
const bookingPayload = ref(null);

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
  uuid: null,
  facility: null,
  room: null,
  date: null,
  time: null,
  dateTo: null,
  timeTo: null,
  title: null,
  details: null,
});


onMounted(async () => {
  await Promise.all([
    facilityStore.fetchFacilities(),
    roomStore.fetchRooms(),
    bookingStore.fetchBookings(getWeekRange(selectedDate.value))
  ]);
});

watch(selectedDate, (date) => {
  bookingStore.fetchBookings(getWeekRange(date));
});

// HANDLERS
function resetBooking() {
  booking.uuid = null;
  booking.facility = null;
  booking.room = null;
  booking.date = null;
  booking.time = null;
  booking.dateTo = null;
  booking.timeTo = null;
  booking.title = null;
  booking.details = null;
}

function handleNewBookingFromCalendar(room, date) {
  resetBooking();
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
  booking.title = null;
  booking.details = null;
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

function handleBackToRoomModal(facility) {
  availableRooms.value = roomsList.value.filter(room => room.facility_uuid === facility.uuid);
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

function handleNextToBulkModal(bookingData) {
  const room = roomsList.value.find(r => r.uuid === bookingData.room_uuid);
  bookingPayload.value = { ...bookingData, needsValidation: room?.needsValidation === 1 };
  showDetailsModal.value = false;
  showBulkModal.value = true;
}

function handleBackToDetailsModal() {
  showBulkModal.value = false;
  showDetailsModal.value = true;
}

function handleBookingDetailsView(booking, isPast) {
  resetBooking();
  isEditingMode.value = false;
  
  showBookingDetailsModal.value = true;
  bookingDetails.value = booking;

  bookingDetails.value.isReadOnly = isPast;
}

function handleBooking(bookingData) {
  const payload = {
    uuid: bookingData.uuid,
    room_uuid: bookingData.room_uuid,
    start_date: bookingData.dateFrom,
    end_date: bookingData.dateTo,
    start_time: bookingData.timeFrom,
    end_time: bookingData.timeTo,
    title: bookingData.title,
    details: bookingData.details
  };

  if (isEditingMode.value) {
    bookingStore.updateBooking(payload);
    isEditingMode.value = false;
  } else {
    bookingStore.createBooking(payload);
  }
  resetBooking();
}

function handleBulkBooking(bookingsArray) {
  const payloads = bookingsArray.map(b => ({
    uuid: b.uuid,
    room_uuid: b.room_uuid,
    start_date: b.dateFrom,
    end_date: b.dateTo,
    start_time: b.timeFrom,
    end_time: b.timeTo,
    title: b.title,
    details: b.details
  }));

  if (bookingsArray.length === 1 && bookingsArray[0].isSingle) {
    bookingStore.createBooking(payloads[0]);
  } else {
    bookingStore.createBulkBookings(payloads, bookingsArray[0]?.needsValidation);
  }
  
  resetBooking();
}

function handleEditBooking(bookingToEdit) {
  isEditingMode.value = true;

  booking.uuid = bookingToEdit.uuid;
  booking.facility = installationsList.value.find(facility =>
    facility.uuid === roomsList.value.find(room =>
      room.uuid === bookingToEdit.room_uuid)?.facility_uuid
  );
  booking.room = roomsList.value.find(room => room.uuid === bookingToEdit.room_uuid);
  booking.date = bookingToEdit.start_date;
  booking.time = bookingToEdit.start_time;
  booking.dateTo = bookingToEdit.end_date;
  booking.timeTo = bookingToEdit.end_time;
  booking.title = bookingToEdit.title;
  booking.details = bookingToEdit.details;

  showBookingDetailsModal.value = false;
  showDetailsModal.value = true;
}

function handleCancelEdit() {
  isEditingMode.value = false;
  resetBooking();
}

const deleteBooking = async (bookingId) => {
  await bookingStore.deleteBooking(bookingId);
}

async function handleBookingStatusUpdate(statusData) {
  await bookingStore.updateBookingStatus(statusData.uuid, statusData.status);
  await bookingStore.fetchBookings(getWeekRange(selectedDate.value));
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

const filteredBookings = computed(() => {
  let list = bookingsList.value;
  if (showOnlyMine.value) {
    list = list.filter(b => b.user_uuid === session.auth.user.uuid);
  }
  return list;
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
