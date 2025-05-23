import { defineStore } from 'pinia';
import { reactive, watch } from 'vue';

export const useConfigStore = defineStore('config', () => {
  const filters = reactive({
    selectedFacilities: '',
  });

  const loadFilters = () => {
    const stored = localStorage.getItem('config-filters');
    if (stored) {
      Object.assign(filters, JSON.parse(stored));
    }
  };

  // Save to localStorage whenever filters change
  watch(filters, (newValue) => {
    localStorage.setItem('config-filters', JSON.stringify(newValue));
  }, { deep: true });

  loadFilters();

  return {
    filters,
  };
});
