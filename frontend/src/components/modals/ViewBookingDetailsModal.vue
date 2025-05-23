<template>
  <div>
    <v-dialog v-model="internalDialog" max-width="500">
      <v-card class="pa-6 rounded-xl" style="position: relative;">
        
        <div class="action-buttons">
          <v-btn 
            v-if="canDeleteBooking && !booking.isReadOnly" 
            class="btn-edit" 
            icon size="small" 
            aria-label="Editar" 
            @click="handleEdit"
          >
            <i class="fa-solid fa-pen-to-square"></i>
          </v-btn>
          <v-btn 
            v-if="canDeleteBooking && !booking.isReadOnly" 
            class="btn-delete" 
            icon size="small" 
            aria-label="Borrar" 
            @click="confirmDelete"
          >
            <i class="fa-solid fa-trash-can"></i>
          </v-btn>
          <v-btn
            icon size="small"
            aria-label="Cerrar"
            @click="internalDialog = false" 
          >
            <i class="fa-solid fa-xmark"></i>
          </v-btn>
        </div>

        <v-card-title class="text-h6 font-weight-bold text-grey-darken-3 pa-0 mb-4">
          {{ booking.title }}
          <v-chip v-if="booking.isReadOnly" size="small" color="grey" class="ml-2">Evento pasado</v-chip>
        </v-card-title>

        <v-card-text class="pa-0">
          <div class="info-line mb-2">
            <i class="fa-solid fa-calendar-days mr-3"></i>
            <span>{{ formatedDate }} {{ startTime }} - {{ endTime }}</span>
          </div>

        <div class="info-line mb-2">
          <div class="color-box mr-3" :style="{ backgroundColor: `${facilitySelected.color}` }"></div>
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
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card class="pa-4 deleteDialog">
        <v-card-title class="text-h6">Confirmar eliminación</v-card-title>
        <v-card-text>
          ¿Está seguro que desea eliminar la reserva "{{ booking.title }}"? Esta acción no se puede deshacer.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="deleteDialog = false">Cancelar</v-btn>
          <v-btn color="error" variant="text" @click="handleDelete">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>


<script setup>
import { ref, watch, computed } from 'vue'
import { sessionStore } from '@/store';
import moment from 'moment/min/moment-with-locales'
moment.locale('es')

const props = defineProps({
  dialog: Boolean,
  booking: Object,
  rooms: Array,
  facilities: Array,
})

const emit = defineEmits(['update:dialog', 'edit', 'delete'])

const session = sessionStore();
const internalDialog = ref(props.dialog)
const deleteDialog = ref(false)

const handleEdit = () => {
  internalDialog.value = false
  emit('edit', props.booking)
}

const handleDelete = () => {
  deleteDialog.value = false
  internalDialog.value = false
  emit('delete', props.booking.uuid)
}

const confirmDelete = () => {
  deleteDialog.value = true
}

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

const facilitySelected = computed(() => {
  return props.facilities.find((facility) => facility.uuid === roomSelected.value.facility_uuid)
})


const canDeleteBooking = computed(() => {
  return session.auth.user.uuid === props.booking.user_uuid || session.auth.user.isAdmin;
});

watch(() => props.dialog, (val) => {
  internalDialog.value = val
})

watch(internalDialog, (val) => {
  emit('update:dialog', val)
})
</script>

<style scoped>
.btn-delete {
  color: #f44336;
}

.btn-edit {
  color: #0077d9;
}

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
  margin-right: 8px;
}
</style>
