import { defineStore } from 'pinia';
import Request from "@/model/request";
import { useNotificationStore } from './useNotificationStore';

export const useFacilityStore = defineStore('facility', {
  state: () => ({
    facilities: [],
    loading: false
  }),
  actions: {
    async fetchFacilities() {
      this.loading = true;
      try {
        const request = new Request({
          endpoint: 'facilities',
          method: 'GET'
        });
        const response = await request.http();
        this.facilities = (response || []).sort((a, b) => a.name.localeCompare(b.name));
      } catch (error) {
        console.error('Error fetching facilities:', error);
        const notification = useNotificationStore();
        notification.notifyError('Error al cargar instalaciones');
      } finally {
        this.loading = false;
      }
    }
  }
});
