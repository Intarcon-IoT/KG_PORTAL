import { defineStore } from 'pinia';
import Request from "@/model/request";
import { useNotificationStore } from './useNotificationStore';

export const useBookingStore = defineStore('booking', {
  state: () => ({
    bookings: [],
    pendingCount: 0,
    loading: false
  }),
  actions: {
    async fetchBookings() {
      this.loading = true;
      try {
        const request = new Request({
          endpoint: 'bookings',
          method: 'GET'
        });
        const response = await request.http();
        this.bookings = response || [];
      } catch (error) {
        console.error('Error fetching bookings:', error);
        const notification = useNotificationStore();
        notification.notifyError('Error al cargar reservas');
      } finally {
        this.loading = false;
      }
    },

    async fetchPendingBookings() {
      this.loading = true;
      try {
        const today = new Date().toISOString().split('T')[0];
        const request = new Request({
          endpoint: 'bookings',
          method: 'GET',
          params: {
            status_in: ['Pending'],
            from_date: today
          }
        });

        const response = await request.http();
        this.bookings = response || [];
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
        const today = new Date().toISOString().split('T')[0];
        const request = new Request({
          endpoint: 'bookings',
          method: 'GET',
          params: {
            status_in: ['Pending'],
            from_date: today
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
        await this.fetchBookings();
        const notification = useNotificationStore();
        notification.notifySuccess(response.body.message);

      } catch (error) {
        console.error('Error creating booking:', error);
        const notification = useNotificationStore();
        notification.notifyError(error.message || 'Error al crear la reserva');
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
        await this.fetchBookings();
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
          if (status === 'Pending') {
            this.bookings[index].status = status;
          } else {
            this.bookings = this.bookings.filter(b => b.uuid !== uuid);
          }
        }
        
        await this.fetchPendingCount();
        
        const notification = useNotificationStore();
        notification.notifySuccess(status === 'Approved' ? 'Reserva aprobada con éxito' : 'Reserva rechazada con éxito');
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
