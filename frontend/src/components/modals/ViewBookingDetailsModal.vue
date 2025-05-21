<template>
  <v-dialog v-model="internalDialog" max-width="500">
    <v-card class="pa-6 rounded-xl" style="position: relative;">
      
      <div class="action-buttons">
        <v-btn icon size="small" aria-label="Editar">
          <i class="fa-solid fa-pen-to-square"></i>
        </v-btn>
        <v-btn icon size="small" aria-label="Borrar">
          <i class="fa-solid fa-trash-can"></i>
        </v-btn>
        <v-btn icon size="small" @click="internalDialog = false" aria-label="Cerrar">
          <i class="fa-solid fa-xmark"></i>
        </v-btn>
      </div>

      <v-card-title class="text-h6 font-weight-bold text-grey-darken-3 pa-0 mb-4">
        {{ booking.title }}
      </v-card-title>

      <v-card-text class="pa-0">
        <div class="info-line mb-2">
          <i class="fa-solid fa-calendar-days mr-3"></i>
          <span>{{ formatedDate }} {{ startTime }} - {{ endTime }}</span>
        </div>

        <div class="info-line mb-2">
          <div class="color-box mr-3"></div>
          <span>{{ roomSelected.name }}</span>
        </div>

        <div class="info-line mb-2">
          <i class="fa-solid fa-align-left mr-3"></i>
          <span>{{ booking.details }}</span>
        </div>

        <div class="info-line mt-4">
          <i class="fa-solid fa-user mr-3"></i>
          <span>{{ booking.name }}</span>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>


<script setup>
import { ref, watch, computed } from 'vue'
import moment from 'moment/min/moment-with-locales'
moment.locale('es')

const props = defineProps({
  dialog: Boolean,
  booking: Object,
  rooms: Array,
})

const emit = defineEmits(['update:dialog'])

const internalDialog = ref(props.dialog)

const formatedDate = computed(() => {
  return moment(props.booking.start_date).format('dddd, D MMMM YYYY')
})

const startTime = computed(() => {
  return moment(props.booking.start_time, 'HH:mm:ss').format('H:mm')
})

const endTime = computed(() => {
  return moment(props.booking.end_time, 'HH:mm:ss').format('H:mm')
})

const roomSelected = computed(() => {
  return props.rooms.find((room) => room.uuid === props.booking.room_uuid)
})

watch(() => props.dialog, (val) => {
  internalDialog.value = val
})

watch(internalDialog, (val) => {
  emit('update:dialog', val)
})
</script>

<style scoped>
.action-buttons {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  z-index: 1;
}

.info-line {
  display: flex;
  align-items: center;
  font-size: 15px;
  color: #333;
}

.color-box {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  background-color: #007bff;
  margin-right: 8px;
}
</style>
