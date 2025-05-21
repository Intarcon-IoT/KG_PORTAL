<template>
  <div class="resource-filter">
    <h4>Filtrar Salas</h4>
    <v-checkbox
      v-for="facility in installationsList"
      :key="facility.uuid"
      :label="facility.name"
      :value="facility.uuid"
      :color="facility.color"
      v-model="selectedFacilities"
      density="compact"
      hide-details
      class="building-checkbox"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  roomsList: Array,
  installationsList: Array,
});

const emit = defineEmits(['update:selectedFacilitiesUuid']);

const selectedFacilities = ref([]);

watch(() => props.installationsList, (newList) => {
    if (newList && newList.length > 0) {
      selectedFacilities.value = newList.map(f => f.uuid);
    }
  },
  { immediate: true }
);

watch(selectedFacilities, (val) => {
  emit('update:selectedFacilitiesUuid', val);
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
