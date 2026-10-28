import { defineStore } from 'pinia';
import { todayKey } from '@/utils/dates';
import Request from "@/model/request";
import { useNotificationStore } from './useNotificationStore';
import { sessionStore } from './session';
import { BOOKING_STATUS } from '@/utils/constants';
import { can } from '@/utils/permissions'

let fetchSeq = 0

export const useBookingStore = defineStore('booking', {
  state: () => ({
    bookings: [],
    pendingCount: 0,
    loading: false,
    currentParams: {}
  }),
  actions: {
    // Sin parámetros se reutiliza el rango visible: sin rango el backend devolvería todas las reservas
    async fetchBookings(params = this.currentParams) {
      this.loading = true;
      this.currentParams = params;
      // Solo cuenta la última petición: una respuesta lenta no pisa a otra más reciente
      const requestId = ++fetchSeq
      try {
        const request = new Request({
          endpoint: 'bookings',
          method: 'GET',
          params
        });
        const response = await request.http();
        if (requestId !== fetchSeq) return
        this.bookings = Array.isArray(response) ? response : [];
      } catch (error) {
        console.error('Error fetching bookings:', error);
        const notification = useNotificationStore();
        notification.notifyError('Error al cargar reservas');
      } finally {
        this.loading = false;
      }
    },

    async fetchBookingsByDateRange(room_uuid, from_date, to_date) {
      try {
        const request = new Request({
          endpoint: 'bookings',
          method: 'GET',
          params: { room_uuid, from_date, to_date }
        });
        return await request.http();
      } catch (error) {
        console.error('Error fetching bookings by date range:', error);
        throw error;
      }
    },

    async fetchPendingBookings() {
      this.loading = true;
      try {
        const today = todayKey();
        const request = new Request({
          endpoint: 'bookings',
          method: 'GET',
          params: {
            status_in: [BOOKING_STATUS.PENDING],
            from_date: today,
            filter_tenant: true
          }
        });

        const response = await request.http();
        this.bookings = Array.isArray(response) ? response : [];
        this.pendingCount = this.bookings.length;
      } catch (error) {
        console.error('Error fetching pending bookings:', error);
        const notification = useNotificationStore();
        notification.notifyError('Error al cargar reservas pendientes');
      } finally {
        this.loading = false;
      }
    },

    async fetchPendingCount() {
      try {
        const today = todayKey();
        const request = new Request({
          endpoint: 'bookings',
          method: 'GET',
          params: {
            status_in: [BOOKING_STATUS.PENDING],
            from_date: today,
            filter_tenant: true
          }
        });

        const response = await request.http();
        this.pendingCount = Array.isArray(response) ? response.length : 0;
      } catch (error) {
        console.error('Error fetching pending count:', error);
      }
    },

    async createBooking(newBooking) {
      this.loading = true;
      try {
        const request = new Request({
          endpoint: 'bookings',
          method: 'POST',
          body: JSON.stringify(newBooking),
        });

        const response = await request.http();
        await this.fetchBookings(this.currentParams);
        const notification = useNotificationStore();
        notification.notifySuccess(response.body?.message || response.message || 'Reserva creada con éxito');

      } catch (error) {
        console.error('Error creating booking:', error);
        const notification = useNotificationStore();
        notification.notifyError(error.message || 'Error al crear la reserva');
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createBulkBookings(bookingsArray, needsValidation = false) {
      this.loading = true;
      const notification = useNotificationStore();
      const session = sessionStore();
      
      try {
        const request = new Request({
          endpoint: 'bookings/bulk',
          method: 'POST',
          body: JSON.stringify({ bookings: bookingsArray }),
        });

        await request.http();
        await this.fetchBookings(this.currentParams);

        const validMsg = (needsValidation && !can(session.auth.user, 'bookings.auto_approve'))? ' y quedan pendientes de validación' : '';
        notification.notifySuccess(`Se han creado ${bookingsArray.length} reservas correctamente${validMsg}`);
      } catch (error) {
        console.error('Error creating bulk bookings:', error);
        notification.notifyError(error.message || 'Error al procesar las reservas en lote');
        await this.fetchBookings(this.currentParams);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateBooking(updatedBooking) {
      this.loading = true;
      try {
        const request = new Request({
          endpoint: `bookings/${updatedBooking.uuid}`,
          method: 'PUT',
          body: JSON.stringify(updatedBooking)
        });

        const response = await request.http();
        await this.fetchBookings(this.currentParams);
        const notification = useNotificationStore();
        notification.notifySuccess(response.message);
      } catch (error) {
        console.error('Error updating booking:', error);
        const notification = useNotificationStore();
        notification.notifyError('Error al actualizar la reserva');
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteBooking(bookingId) {
      this.loading = true;
      try {
        const request = new Request({
          endpoint: `bookings/${bookingId}`,
          method: 'DELETE'
        });

        await request.http();
        this.bookings = this.bookings.filter(b => b.uuid !== bookingId);
        const notification = useNotificationStore();
        notification.notifySuccess('Reserva eliminada con éxito');
      } catch (error) {
        console.error('Error deleting booking:', error);
        const notification = useNotificationStore();
        notification.notifyError('Error al eliminar la reserva');
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateBookingStatus(uuid, status) {
      this.loading = true;
      try {
        const request = new Request({
          endpoint: `bookings/${uuid}`,
          method: 'PUT',
          body: JSON.stringify({ status })
        });

        const response = await request.http();
        
        const index = this.bookings.findIndex(b => b.uuid === uuid);
        if (index !== -1) {
          if (status === BOOKING_STATUS.PENDING) {
            this.bookings[index].status = status;
          } else {
            this.bookings = this.bookings.filter(b => b.uuid !== uuid);
          }
        }
        
        await this.fetchPendingCount();
        
        const notification = useNotificationStore();
        notification.notifySuccess(status === BOOKING_STATUS.APPROVED ? 'Reserva aprobada con éxito' : 'Reserva rechazada con éxito');
        return response;
      } catch (error) {
        console.error('Error updating booking status:', error);
        const notification = useNotificationStore();
        notification.notifyError(error.message || 'Error al actualizar el estado');
        throw error;
      } finally {
        this.loading = false;
      }
    }
  }
});
