import { defineStore } from 'pinia';
import Request from "@/model/request";
import { useNotificationStore } from './useNotificationStore';

export const useRoomStore = defineStore('room', {
  state: () => ({
    rooms: [],
    loading: false
  }),
  actions: {
    async fetchRooms() {
      this.loading = true;
      try {
        const request = new Request({
          endpoint: 'rooms',
          method: 'GET'
        });
        const response = await request.http();
        this.rooms = response || [];
      } catch (error) {
        console.error('Error fetching rooms:', error);
        const notification = useNotificationStore();
        notification.notifyError('Error al cargar salas');
      } finally {
        this.loading = false;
      }
    }
  }
});
