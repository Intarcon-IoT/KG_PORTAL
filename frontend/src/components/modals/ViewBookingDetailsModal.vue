<template>
  <div>
    <appDialog v-model="internalDialog" eyebrow="Reserva" :title="booking?.title || ''" :width="500">
      <template #tools>
        <button v-if="canDeleteBooking && !isReadOnly" type="button" class="kg-icon-btn" aria-label="Editar reserva" @click="handleEdit">
          <i class="fa-solid fa-pen" />
          <v-tooltip activator="parent" location="top">Editar</v-tooltip>
        </button>
        <button v-if="canDeleteBooking && !isReadOnly" type="button" class="kg-icon-btn danger" aria-label="Eliminar reserva" @click="confirmDelete">
          <i class="fa-solid fa-trash-can" />
          <v-tooltip activator="parent" location="top">Eliminar</v-tooltip>
        </button>
      </template>

      <div v-if="isReadOnly || isPending || wasEdited" class="tags">
        <span v-if="isPending" class="tag tag-pending">Pendiente de aprobación</span>
        <span v-if="isReadOnly" class="tag">Evento pasado</span>
        <span v-if="wasEdited" class="tag">Editada</span>
      </div>

      <ul class="info">
        <li>
          <i class="fa-regular fa-calendar" />
          <span v-if="formatedDate === formatedDateTo" class="cap">{{ formatedDate }} · {{ startTime }} – {{ endTime }}</span>
          <span v-else class="cap">{{ formatedDate }}, {{ startTime }}<br>{{ formatedDateTo }}, {{ endTime }}</span>
        </li>
        <li>
          <span class="color-box" :style="{ background: facilitySelected?.color }" />
          <span>{{ roomSelected?.name || 'Sala no disponible' }}<small v-if="facilitySelected"> · {{ facilitySelected.name }}</small></span>
        </li>
        <li v-if="booking.details">
          <i class="fa-solid fa-align-left" />
          <span class="details">{{ booking.details }}</span>
        </li>
        <li>
          <i class="fa-regular fa-user" />
          <span>{{ booking.name }}</span>
        </li>
      </ul>

      <template v-if="canManageStatus && isPending && !isReadOnly" #actions>
        <v-btn variant="outlined" class="kg-btn kg-btn-danger-ghost" @click="handleStatusUpdate(BOOKING_STATUS.REJECTED)">Rechazar</v-btn>
        <v-btn color="primary" variant="flat" class="kg-btn" @click="handleStatusUpdate(BOOKING_STATUS.APPROVED)">Aprobar</v-btn>
      </template>
    </appDialog>

    <appDialog v-model="deleteDialog" title="¿Eliminar reserva?" icon="fa-solid fa-trash-can" tone="danger" :width="440">
      <div class="kg-summary">
        <span class="kg-summary-title">{{ booking.title }}</span>
        <dl>
          <div><dt>Fecha</dt><dd class="cap">{{ formatedDate }}</dd></div>
          <div><dt>Hora</dt><dd>{{ startTime }} – {{ endTime }}</dd></div>
          <div v-if="facilitySelected"><dt>Sede</dt><dd>{{ facilitySelected.name }}</dd></div>
          <div v-if="roomSelected"><dt>Sala</dt><dd>{{ roomSelected.name }}</dd></div>
        </dl>
      </div>
      <p class="kg-note kg-note-danger">Esta acción no se puede deshacer.</p>

      <template #actions>
        <v-btn variant="outlined" class="kg-btn kg-btn-ghost" @click="deleteDialog = false">Cancelar</v-btn>
        <v-btn color="#b91c1c" variant="flat" class="kg-btn" @click="handleDelete">Eliminar</v-btn>
      </template>
    </appDialog>
  </div>
</template>

<script setup>
import appDialog from '@/components/app-dialog.vue'
import { ref, watch, computed } from 'vue'
import { sessionStore } from '@/store';
import moment from 'moment/min/moment-with-locales'
import { BOOKING_STATUS, ROLES } from '@/utils/constants';
moment.locale('es')

const props = defineProps({
  dialog: Boolean,
  booking: Object,
  rooms: Array,
  facilities: Array,
})

const emit = defineEmits(['update:dialog', 'edit', 'delete', 'status-update'])

const session = sessionStore();
const internalDialog = ref(props.dialog)
const deleteDialog = ref(false)

const isAdmin = computed(() => session.auth.user?.role === ROLES.ADMIN);
const isGestor = computed(() => session.auth.user?.role === ROLES.GESTOR);
const canManageStatus = computed(() => isAdmin.value);
const isPending = computed(() => props.booking && props.booking.status === BOOKING_STATUS.PENDING);

const handleStatusUpdate = (status) => {
  emit('status-update', { uuid: props.booking.uuid, status });
  internalDialog.value = false;
}

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

const wasEdited = computed(() => {
  return props.booking && props.booking.updated_ts !== null;
});

const formatedDate = computed(() => {
  return moment(props.booking.start_date).format('dddd, D [de] MMMM [de] YYYY')
})

const formatedDateTo = computed(() => {
  return moment(props.booking.end_date).format('dddd, D [de] MMMM [de] YYYY')
})

const startTime = computed(() => {
  return moment(props.booking.start_time, 'HH:mm').format('HH:mm')
})

const endTime = computed(() => {
  return moment(props.booking.end_time, 'HH:mm').format('HH:mm')
})

const roomSelected = computed(() => {
  return props.rooms.find((room) => room.uuid === props.booking.room_uuid)
})

const facilitySelected = computed(() => {
  return props.facilities.find((facility) => facility.uuid === roomSelected.value?.facility_uuid)
})


const canDeleteBooking = computed(() => {
  const isOwner = session.auth.user.uuid === props.booking.user_uuid;
  const gestorCanAct = isGestor.value && props.booking?.status === BOOKING_STATUS.APPROVED;
  return isOwner || isAdmin.value || gestorCanAct;
});

const isReadOnly = computed(() => {
  return props.booking.end_date < moment().format('YYYY-MM-DD');
})

watch(() => props.dialog, (val) => {
  internalDialog.value = val
})

watch(internalDialog, (val) => {
  emit('update:dialog', val)
})
</script>

<style scoped>
.tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px }
.tag { padding: 3px 10px; border-radius: 999px; background: #f1f2f4; color: #475569; font-size: .75rem; font-weight: 600 }
.tag-pending { background: #fff7ed; color: #b45309 }

.info { display: flex; flex-direction: column; gap: 12px; margin: 0; padding: 0; list-style: none; font-size: .925rem; color: #111111 }
.info li { display: flex; align-items: flex-start; gap: 12px; line-height: 1.5 }
.info i { width: 16px; margin-top: 4px; font-size: .85rem; text-align: center; color: #64748b }
.info small { color: #64748b; font-size: .85rem }
.cap::first-letter { text-transform: uppercase }
.details { white-space: pre-line; overflow-wrap: anywhere; color: #334155 }
.color-box { flex-shrink: 0; width: 12px; height: 12px; margin: 5px 2px 0; border-radius: 3px; background: #cbd5e1 }
</style>
