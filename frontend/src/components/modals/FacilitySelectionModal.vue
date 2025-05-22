<template>
  <v-dialog v-model="internalDialog" max-width="500" transition="dialog-bottom-transition">
    <v-card class="pa-4 rounded-xl">
      <v-card-title class="d-flex align-center position-relative text-subtitle-1 font-weight-medium text-grey-darken-3">
        <div class="w-100 text-center">Selecciona una instalación</div>
        <i class="fa-solid fa-xmark position-absolute fa-lg close-icon" @click="internalDialog = false"></i>
      </v-card-title>
      <v-card-text>
        <v-list>
          <v-list-item
            v-for="facility in installations"
            :key="facility.uuid"
            @click="selectFacility(facility)"
            class="custom-list-item"
          >
            <span class="custom-item-text">{{ facility.name }}</span>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  dialog: Boolean,
  installations: Array
})

const emit = defineEmits(['update:dialog', 'next'])

const internalDialog = ref(props.dialog)

watch(() => props.dialog, (val) => {
  internalDialog.value = val
})

watch(internalDialog, (val) => {
  emit('update:dialog', val)
})

function selectFacility(facility) {
  emit('next', facility)
  emit('update:dialog', false)
}
</script>

<style scoped>
.close-icon {
  position: absolute;
  right: 0;
  margin-right: 12px;
  cursor: pointer;
  color: #666;
  transition: transform 0.2s ease, color 0.2s ease;
}

.close-icon:hover {
  color: #ff0000;
}

.custom-list-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 12px;
  background-color: #f5f5f5;
  transition: background-color 0.2s ease;
  cursor: pointer;
}

.custom-list-item:hover {
  background-color: #e0e0e0;
}

.custom-item-text {
  font-size: 16px;
  color: #333;
}
</style>
