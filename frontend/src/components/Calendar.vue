<template>
  <div class="calendar-page">
    <CalendarHeader
      :selectedDate="selectedDate"
      :filtersOpen="showFilters"
      @previous="navigatePrevious"
      @next="navigateNext"
      @today="goToToday"
      @create="showFacilityModal = true"
      @toggle-filters="showFilters = !showFilters"
    />

    <div class="calendar-layout">
      <aside class="calendar-aside" :class="{ open: showFilters }">
        <section class="panel">
          <MiniMonthView :selected-date="selectedDate" @dateSelected="selectedDate = $event" />
        </section>
        <section v-if="installationsList.length > 0" class="panel">
          <ResourceFilter :installationsList="installationsList" @update:selectedFacilitiesUuid="handlerSelectedFacilitiesFilter" />
        </section>
        <section class="panel panel-compact">
          <UserOnlySwitch v-model="showOnlyMine" />
        </section>
      </aside>

      <div class="calendar-board">
        <WeekView
          :selected-date="selectedDate"
          :selectedFacilities="selectedFacilities"
          :selectedRooms="selectedRooms"
          :bookingsList="filteredBookings"
          @booking_click="handleBookingDetailsView"
          @empty_cell_click="handleNewBookingFromCalendar"
        />
      </div>
    </div>

    <div class="calendar-modals">
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
import { toDateKey } from '@/utils/dates'
import { storeToRefs } from 'pinia';
import CalendarHeader from './calendar-navigation/CalendarHeader.vue';
import WeekView from './views/WeekView.vue';
import MiniMonthView from './views/MiniMonthView.vue';
import FacilitySelectionModal from './modals/FacilitySelectionModal.vue';
import RoomSelectionModal from './modals/RoomSelectionModal.vue';
import DateSelectionModal from './modals/DateSelectionModal.vue';
import DetailsSelectionModal from './modals/DetailsSelectionModal.vue';
import BulkBookingModal from './modals/BulkBookingModal.vue';
import ViewBookingDetailsModal from './modals/ViewBookingDetailsModal.vue';
import ResourceFilter from './filters/ResourceFilter.vue';
import { ref, reactive, computed, watch, onMounted } from 'vue';

const formatDate = toDateKey

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
import { sessionStore, useBookingStore, useFacilityStore, useRoomStore } from '@/store';

// Panel de filtros desplegable en pantallas estrechas
const showFilters = ref(false)

// SHOW MODALS
const showFacilityModal = ref(false);
const showRoomModal = ref(false);
const showDateModal = ref(false);
const showDetailsModal = ref(false);
const showBulkModal = ref(false);
const showBookingDetailsModal = ref(false);

// STORE
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

// NAVIGATION: la vista es siempre semanal
const shiftWeek = weeks => { const d = new Date(selectedDate.value); d.setDate(d.getDate() + weeks * 7); selectedDate.value = d }
const navigatePrevious = () => shiftWeek(-1)
const navigateNext = () => shiftWeek(1)
const goToToday = () => { selectedDate.value = new Date() }

const filteredBookings = computed(() => {
  let list = bookingsList.value;
  if (showOnlyMine.value) {
    list = list.filter(b => b.user_uuid === session.auth.user.uuid);
  }
  return list;
});
</script>

<style scoped>
.calendar-page { display: flex; flex-direction: column; gap: 16px; height: calc(100dvh - var(--topbar-height)); padding: 16px 24px 20px; background: #f6f7f9 }

.calendar-layout { display: grid; grid-template-columns: 264px minmax(0, 1fr); gap: 16px; flex: 1; min-height: 0 }

.calendar-aside { display: flex; flex-direction: column; gap: 14px; min-height: 0; overflow-y: auto; scrollbar-width: thin }

.panel { padding: 18px; border: 1px solid #eceef2; border-radius: 14px; background: #ffffff }
.panel-compact { padding: 12px 18px }

.calendar-board { display: flex; flex-direction: column; min-height: 0; overflow: hidden; border: 1px solid #eceef2; border-radius: 14px; background: #ffffff }

@media (width < 1100px) {
  .calendar-page { height: auto; min-height: calc(100dvh - var(--topbar-height)); padding: 20px 16px }
  .calendar-layout { grid-template-columns: 1fr }
  .calendar-aside { display: none; overflow: visible }
  .calendar-aside.open { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); align-items: start }
  .calendar-board { height: 70dvh }
}
</style>
