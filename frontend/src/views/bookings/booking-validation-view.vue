<!-- Validación de reservas pendientes (permiso bookings.validate) -->
<script setup>
import { computed, onMounted } from 'vue'
import BookingValidationList from '@/components/lists/booking-validation-list.vue'
import { useBookingStore, useFacilityStore, useRoomStore } from '@/store'

const bookingStore = useBookingStore()
const facilityStore = useFacilityStore()
const roomStore = useRoomStore()

const bookingsList = computed(() => bookingStore.bookings)

onMounted(() => Promise.all([roomStore.fetchRooms(), facilityStore.fetchFacilities(), bookingStore.fetchPendingBookings()]))

const handleUpdateStatus = async ({ uuid, status }) => {
  await bookingStore.updateBookingStatus(uuid, status)
  await bookingStore.fetchPendingBookings()
}
</script>

<template>
  <div class="validation">
    <header class="validation-head">
      <div>
        <span class="eyebrow">Reservas de salas</span>
        <h1>Validar reservas</h1>
        <p>Solicitudes en salas con aprobación que esperan tu revisión.</p>
      </div>
      <div class="validation-stats">
        <div class="stat">
          <span class="stat-value">{{ bookingStore.pendingCount }}</span>
          <span class="stat-label">{{ bookingStore.pendingCount === 1 ? 'Pendiente' : 'Pendientes' }}</span>
        </div>
      </div>
    </header>

    <BookingValidationList
      :bookings="bookingsList"
      :rooms="roomStore.rooms"
      :facilities="facilityStore.facilities"
      :loading="bookingStore.loading"
      @update-status="handleUpdateStatus"
    />
  </div>
</template>

<style scoped>
.validation { max-width: 1200px; margin: 0 auto; padding: 32px 24px 48px; color: #111111 }

.validation-head { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 24px }
.eyebrow { display: block; margin-bottom: 4px; font-size: .72rem; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: #468131 }
.validation-head h1 { margin: 0; font-size: 1.6rem; font-weight: 600; letter-spacing: -0.01em }
.validation-head p { margin: 4px 0 0; font-size: .9rem; color: #64748b }

.validation-stats { display: flex; gap: 10px }
.stat { display: flex; align-items: baseline; gap: 8px; padding: 10px 16px; border: 1px solid #eceef2; border-radius: 12px; background: #ffffff }
.stat-value { font-size: 1.4rem; font-weight: 700; line-height: 1 }
.stat-label { font-size: .8rem; font-weight: 500; color: #64748b }

@media (width < 760px) {
  .validation { padding: 20px 16px 32px }
  .validation-head h1 { font-size: 1.3rem }
}
</style>
