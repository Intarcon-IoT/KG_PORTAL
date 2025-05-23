<template>
  <div class="resource-filter">
    <h4>Filtrar Salas</h4>
    <v-checkbox
      v-for="facility in installationsList"
      :key="facility.uuid"
      :label="facility.name"
      :value="facility.uuid"
      :color="facility.color"
      v-model="filters.selectedFacilities"
      density="compact"
      hide-details
      class="building-checkbox"
    />
  </div>
</template>

<script setup>
import { watch } from 'vue';
import { useConfigStore } from '@/store';

const props = defineProps({
  installationsList: Array,
});

const emit = defineEmits(['update:selectedFacilitiesUuid']);
const { filters } = useConfigStore();

// Inicializa como array si aún no existe
if (!Array.isArray(filters.selectedFacilities)) {
  filters.selectedFacilities = props.installationsList.map((facility) => facility.uuid);
}

// Emitimos los valores seleccionados
watch(() => filters.selectedFacilities, (val) => {
  emit('update:selectedFacilitiesUuid', val);
}, { immediate: true });
</script>

<style scoped>
.resource-filter {
  font-size: 0.9em;
}

h4 {
  margin-top: 0;
  margin-bottom: 10px;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}

.building-checkbox {
  margin-bottom: 8px;
  display: block;
}
</style>
