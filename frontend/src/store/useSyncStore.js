import { defineStore } from 'pinia';
import { useBookingStore } from './useBookingStore';
import { sessionStore } from './session';
import router from '@/router';
import { ROLES } from '@/utils/constants';

export const useSyncStore = defineStore('sync', {
  state: () => ({
    intervalId: null,
    isInitialized: false,
    syncIntervalMs: 60000, // 1 minute
  }),

  actions: {
    initSync() {
      if (this.isInitialized) return;

      this.performSync();

      this.intervalId = setInterval(() => {
        this.performSync();
      }, this.syncIntervalMs);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);

      this.isInitialized = true;
    },

    cleanup() {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      this.isInitialized = false;
    },

    handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        this.performSync();
      }
    },

    async performSync() {
      const session = sessionStore();
      const bookingStore = useBookingStore();

      if (!session.auth.user) return;

      if (session.auth.user.role === ROLES.ADMIN || session.auth.user.role === ROLES.GESTOR) {
        bookingStore.fetchPendingCount();
      }

      const currentRoute = router.currentRoute.value.path;

      if (currentRoute === '/calendar') {
        await bookingStore.fetchBookings();
      } else if (currentRoute === '/bookings-validation') {
        await bookingStore.fetchPendingBookings();
      }
    }
  }
});
