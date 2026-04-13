<template>
  <div class="bookings-admin-container">
    <div class="bookings-admin-header">
      <div class="title-with-subtitle">
        <h1>Validación de Reservas</h1>
        <p class="text-subtitle-1 text-grey-darken-1">Gestione las solicitudes de reserva pendientes de revisión administrativa</p>
      </div>
      <div class="header-stats" v-if="bookingStore.pendingCount > 0">
        <v-chip color="warning" variant="flat" prepend-icon="fa fa-clock">
          {{ bookingStore.pendingCount }} Pendientes
        </v-chip>
      </div>
    </div>

    <v-card class="bookings-table-container">
      <booking-validation-list 
        :bookings="bookingsList" 
        :rooms="roomsList"
        :users="usersList"
        :facilities="facilitiesList"
        :loading="bookingStore.loading"
        @update-status="handleUpdateStatus"
      />
    </v-card>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import BookingValidationList from '@/components/lists/booking-validation-list.vue';
import { useNotificationStore, useBookingStore, useFacilityStore, useRoomStore, useUserStore } from '@/store';

const notification = useNotificationStore();
const bookingStore = useBookingStore();
const facilityStore = useFacilityStore();
const roomStore = useRoomStore();
const userStore = useUserStore();

const bookingsList = computed(() => bookingStore.bookings);
const roomsList = computed(() => roomStore.rooms);
const usersList = computed(() => userStore.users);
const facilitiesList = computed(() => facilityStore.facilities);

onMounted(async () => {
  await Promise.all([
    roomStore.fetchRooms(),
    userStore.fetchUsers(),
    facilityStore.fetchFacilities(),
    bookingStore.fetchPendingBookings()
  ]);
});

const handleUpdateStatus = async ({ uuid, status }) => {
  await bookingStore.updateBookingStatus(uuid, status);
  await bookingStore.fetchPendingBookings();
};
</script>

<style scoped>
.bookings-admin-container {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.bookings-admin-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.title-with-subtitle h1 {
  font-size: 1.75rem;
  font-weight: 500;
  color: var(--primary-dark, #333);
  margin: 0 0 0.25rem 0;
}

.title-with-subtitle p {
  margin: 0;
}

.header-stats {
  padding-top: 0.5rem;
}

.bookings-table-container {
  background-color: var(--white-transparent-xs, #ffffff);
  border-radius: 8px;
  padding: 1rem;
}

@media (max-width: 768px) {
  .bookings-admin-container {
    padding: 1rem;
  }
  
  .bookings-admin-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
}
</style>
