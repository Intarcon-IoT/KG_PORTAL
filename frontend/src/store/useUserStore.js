import { defineStore } from 'pinia';
import Request from "@/model/request";
import { useNotificationStore } from './useNotificationStore';

export const useUserStore = defineStore('user', {
  state: () => ({
    users: [],
    loading: false
  }),
  actions: {
    async fetchUsers() {
      this.loading = true;
      try {
        const request = new Request({
          endpoint: 'users',
          method: 'GET'
        });
        const response = await request.http();
        this.users = response || [];
      } catch (error) {
        console.error('Error fetching users:', error);
        const notification = useNotificationStore();
        notification.notifyError('Error al cargar usuarios');
      } finally {
        this.loading = false;
      }
    }
  }
});
