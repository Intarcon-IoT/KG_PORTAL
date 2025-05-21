<template>
  <div class="resource-filter">
    <h4 @click="() => { console.log(buildings) }">Filtrar Salas</h4>
    <v-checkbox
      v-for="building in buildings"
      :key="building.id"
      :label="building.name"
      :value="building.id"
      v-model="selectedBuildingArray"
      :color="building.color"
      density="compact"
      hide-details
      class="building-checkbox"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  allResources: {
    type: Array,
    required: true
  },
  selectedBuildingIds: {
    type: Set,
    required: true
  }
});

const emit = defineEmits(['update:selectedBuildingIds']);

const buildings = computed(() => {
  const buildingMap = new Map();
  props.allResources.forEach(resource => {
    if (resource.building && !buildingMap.has(resource.building)) {
      buildingMap.set(resource.building, { id: resource.building, name: resource.building, color: resource.todo.find(e => e.name === resource.building).color });
    }
  });
  return Array.from(buildingMap.values());
});

const selectedBuildingArray = computed({
  get() {
    return Array.from(props.selectedBuildingIds);
  },
  set(newValue) {
    emit('update:selectedBuildingIds', new Set(newValue));
  }
});
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
