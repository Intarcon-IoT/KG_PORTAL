<template>
  <v-dialog v-model="internalDialog" max-width="500" transition="dialog-bottom-transition" persistent>
    <v-card class="pa-4 rounded-xl">
      <v-card-title class="d-flex align-center position-relative text-subtitle-1 font-weight-medium text-grey-darken-3">
        <i class="fa-solid fa-arrow-left position-absolute start-5 fa-lg back-icon" @click="goBack"></i>
        <div class="w-100 text-center">Selecciona una sala</div>
        <i class="fa-solid fa-xmark position-absolute fa-lg close-icon" @click="internalDialog = false"></i>
      </v-card-title>
      <v-card-text>
        <v-list>
          <v-list-item
            v-for="room in rooms"
            :key="room.uuid"
            @click="selectRoom(room)"
            class="custom-list-item"
          >
            <div class="item-content">
              <span class="custom-item-text">{{ room.name }}</span>
              <span v-if="room.needsValidation" class="validation-badge">
                <v-tooltip activator="parent" location="top">
                  Las reservas en esta sala necesitan aprobación
                </v-tooltip>
                <i class="fa-solid fa-circle-exclamation"></i>
              </span>
              <span class="capacity-text">{{ room.capacity }} personas</span>
            </div>
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
  rooms: Array
})

const emit = defineEmits(['update:dialog', 'next', 'back'])

const internalDialog = ref(props.dialog)

watch(() => props.dialog, (val) => {
  internalDialog.value = val
})

watch(internalDialog, (val) => {
  emit('update:dialog', val)
})

function selectRoom(room) {
  emit('update:dialog', false)
  emit('next', room)
}

function goBack() {
  emit('update:dialog', false)
  emit('back')
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
  color: #ff5252;
}

.back-icon {
  cursor: pointer;
  color: #666;
  transition: transform 0.2s ease, color 0.2s ease;
}

.back-icon:hover {
  color:#24008f;
}

.custom-list-item {
  padding: 12px 16px;
  border-radius: 12px;
  background-color: #f5f5f5;
  transition: background-color 0.2s ease;
  cursor: pointer;
}

.custom-list-item:hover {
  background-color: #e0e0e0;
}

.item-content {
  display: flex;
  justify-content: space-between;
  width: 100%;
  align-items: center;
}

.custom-item-text {
  font-size: 16px;
  color: #333;
}

.capacity-text {
  font-size: 14px;
  color: #666;
}

.validation-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #d32f2f;
  font-size: 1rem;
  margin-left: 8px;
  cursor: help;
}
</style>
