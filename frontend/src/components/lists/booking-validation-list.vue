<template>
  <div class="booking-validation-list-container">

    <div class="filter-container">
      <v-row>
        <v-col cols="12" md="4">
          <v-autocomplete
            v-model="selectedRoom"
            :items="rooms"
            item-title="name"
            item-value="uuid"
            label="Filtrar por sala"
            density="comfortable"
            variant="outlined"
            clearable
            prepend-inner-icon="fa fa-door-open"
          ></v-autocomplete>
        </v-col>
        <v-col cols="12" md="4">
          <v-autocomplete
            v-model="selectedUser"
            :items="users"
            item-title="name"
            item-value="uuid"
            label="Filtrar por usuario"
            density="comfortable"
            variant="outlined"
            clearable
            prepend-inner-icon="fa fa-user"
          ></v-autocomplete>
        </v-col>
        <v-col cols="12" md="4">
          <v-menu
            v-model="menu"
            :close-on-content-click="false"
            transition="scale-transition"
          >
            <template v-slot:activator="{ props }">
              <v-text-field
                v-model="selectedDateFormatted"
                label="Filtrar por fecha"
                density="comfortable"
                variant="outlined"
                readonly
                clearable
                v-bind="props"
                prepend-inner-icon="fa-solid fa-calendar"
                @click:clear="clearDate"
              ></v-text-field>
            </template>

            <v-card>
              <v-card-text class="d-flex gap-2 flex-wrap">
                <v-btn size="small" variant="tonal" @click="setToday">Hoy</v-btn>
                <v-btn size="small" variant="tonal" @click="setThisWeek">Esta semana</v-btn>
                <v-btn size="small" variant="tonal" @click="setThisMonth">Este mes</v-btn>
              </v-card-text>

              <v-date-picker
                v-model="selectedDate"
                multiple="range"
                @update:model-value="menu = false"
              ></v-date-picker>
            </v-card>
          </v-menu>
        </v-col>
      </v-row>
    </div>
    
    <v-data-table
      :headers="headers"
      :items="processedItems"
      :loading="loading"
      class="elevation-1 rounded-lg booking-table"
      density="comfortable"
      :no-data-text="loading ? 'Cargando reservas...' : 'No hay reservas pendientes de validación'"
      show-expand
      item-value="id"
    >
      <template v-slot:item.data-table-expand="{ item, internalItem, isExpanded, toggleExpand }">
        <v-btn
          v-if="item.isGroup"
          variant="text"
          class="v-data-table__expand-icon"
          :class="{ 'v-data-table__expand-icon--active': isExpanded(internalItem) }"
          :icon="isExpanded(internalItem) ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"
          @click="toggleExpand(internalItem)"
        ></v-btn>
      </template>
      <template v-slot:item.title="{ item }">
        <div class="d-flex align-center">
          <v-icon size="small" :color="item.isGroup ? 'primary' : 'deep-purple'" class="mr-2">
            {{ item.isGroup ? 'fa-solid fa-layer-group' : 'fa-solid fa-calendar-day' }}
          </v-icon>
          <span class="font-weight-medium">
            {{ item.title }}
            <v-chip v-if="item.isGroup" size="x-small" color="primary" class="ml-2" variant="tonal">
              Serie ({{ item.count }})
            </v-chip>
          </span>
        </div>
      </template>

      <template v-slot:item.room_name="{ item }">
        <div class="d-flex align-center">
          <v-icon 
            size="small" 
            class="mr-2" 
            :style="{ color: getRoomFacility(item.room_uuid)?.color || 'grey' }"
          >fa-solid fa-door-open</v-icon>
          <span class="font-weight-medium">
            {{ getRoomName(item.room_uuid) }} 
            <small class="text-grey-darken-1 ml-1" v-if="getRoomFacility(item.room_uuid)">
              ({{ getRoomFacility(item.room_uuid).name }})
            </small>
          </span>
        </div>
      </template>

      <template v-slot:item.user_name="{ item }">
        <div class="d-flex align-center">
          <v-icon size="small" color="blue-grey" class="mr-2">fa-solid fa-user</v-icon>
          <span>{{ item.username || item.name }}</span>
        </div>
      </template>

      <template v-slot:item.start_date="{ item }">
        <template v-if="item.isGroup">
          <div class="text-caption">
            {{ formatDate(item.start_date) }} - {{ formatDate(item.end_date) }}
          </div>
        </template>
        <span v-else>{{ formatDate(item.start_date) }}</span>
      </template>

      <template v-slot:item.times="{ item }">
        <div class="d-flex align-center gap-2">
          <v-chip size="small" variant="flat" color="blue-lighten-5" class="text-blue-darken-3">
            {{ item.start_time.substring(0, 5) }} - {{ item.end_time.substring(0, 5) }}
          </v-chip>

          <v-tooltip v-if="!item.isGroup && overlappingBookings.has(item.uuid)" text="Conflicto de horario">
            <template v-slot:activator="{ props }">
              <v-icon size="small" color="orange" v-bind="props">fa-solid fa-triangle-exclamation</v-icon>
            </template>
          </v-tooltip>
        </div>
      </template>
      
      <template v-slot:item.actions="{ item }">
        <div class="actions-container">
          <v-tooltip :text="item.isGroup ? 'Aprobar serie completa' : 'Aprobar reserva'">
            <template v-slot:activator="{ props }">
              <v-btn
                icon
                color="success"
                variant="text"
                v-bind="props"
                @click="item.isGroup ? handleBatchAction(item, 'Approved') : attemptApprove(item)"
              >
                <i :class="item.isGroup ? 'fa-solid fa-check-double' : 'fa-solid fa-circle-check'"></i>
              </v-btn>
            </template>
          </v-tooltip>
          <v-tooltip :text="item.isGroup ? 'Rechazar serie completa' : 'Rechazar reserva'">
            <template v-slot:activator="{ props }">
              <v-btn
                icon
                color="error"
                variant="text"
                v-bind="props"
                @click="item.isGroup ? handleBatchAction(item, 'Rejected') : handleStatusCheck(item, 'Rejected')"
              >
                <i :class="item.isGroup ? 'fa-solid fa-ban' : 'fa-solid fa-circle-xmark'"></i>
              </v-btn>
            </template>
          </v-tooltip>
        </div>
      </template>

      <template v-slot:expanded-row="{ columns, item }">
        <tr>
          <td :colspan="columns.length" class="bg-grey-lighten-4 pa-0">
            <div class="pa-4">
              <div class="text-subtitle-2 mb-2">Fechas de la serie:</div>
              <div class="d-flex flex-wrap gap-2">
                <v-chip
                  v-for="b in item.bookings"
                  :key="b.uuid"
                  size="small"
                  variant="outlined"
                  class="bg-white"
                >
                  {{ formatDate(b.start_date) }}
                </v-chip>
              </div>
            </div>
          </td>
        </tr>
      </template>

      <template v-slot:no-data>
        <div class="d-flex flex-column align-center py-8">
          <i class="fa-solid fa-calendar-check text-grey-lighten-1 mb-3" style="font-size: 3rem;"></i>
          <span v-if="loading" class="text-grey-darken-1">Cargando reservas...</span>
          <span v-else class="text-grey-darken-1">Todo al día. No hay reservas pendientes de validación.</span>
        </div>
      </template>
    </v-data-table>
    <OverlappingBookingModal
      :model-value="confirmModal"
      :booking="modalBooking"
      :room="modalBooking ? getRoomObject(modalBooking.room_uuid) : null"
      :facility="modalBooking ? getRoomFacility(modalBooking.room_uuid) : null"
      @update:model-value="confirmModal = $event"
      @confirm="confirmApproval"
      @cancel="cancelApproval"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import OverlappingBookingModal from '../modals/OverlappingBookingModal.vue';

const selectedDate = ref([]);
const menu = ref(false);
const confirmModal = ref(false);
const modalBooking = ref(null);

const props = defineProps({
  bookings: {
    type: Array,
    required: true,
    default: () => []
  },
  rooms: {
    type: Array,
    default: () => []
  },
  facilities: {
    type: Array,
    default: () => []
  },
  users: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update-status']);

const selectedRoom = ref(null);
const selectedUser = ref(null);

const headers = [
  { title: 'Titulo', key: 'title', sortable: true, align: 'center' },
  { title: 'Sala', key: 'room_name', sortable: true, align: 'center' },
  { title: 'Usuario', key: 'user_name', sortable: true, align: 'center' },
  { title: 'Fecha', key: 'start_date', sortable: true, align: 'center' },
  { title: 'Horario', key: 'times', sortable: false, align: 'center' },
  { title: 'Acciones', key: 'actions', sortable: false, align: 'center' }
];

const filteredBookings = computed(() => {
  return props.bookings.filter(booking => {
    const matchesRoom = !selectedRoom.value || booking.room_uuid === selectedRoom.value;
    const matchesUser = !selectedUser.value || booking.user_uuid === selectedUser.value;

    const matchesDate = (() => {
      if (!selectedDate.value || selectedDate.value.length === 0) return true;

      const dates = selectedDate.value;
      const startDate = new Date(dates[0]);
      const endDate = new Date(dates[dates.length - 1]);
      const bookingDate = new Date(booking.start_date);

      startDate.setHours(0,0,0,0);
      endDate.setHours(23,59,59,999);
      bookingDate.setHours(0,0,0,0);

      return bookingDate >= startDate && bookingDate <= endDate;
    })();

    return matchesRoom && matchesUser && matchesDate;
  });
});

const processedItems = computed(() => {
  const items = filteredBookings.value;
  const groupsMap = new Map();
  const independentItems = [];
  const conflictsSet = overlappingBookings.value;

  items.forEach(item => {
    if (conflictsSet.has(item.uuid)) {
      independentItems.push({ ...item, isGroup: false, id: item.uuid });
    } else {
      const key = `${item.user_uuid}-${item.room_uuid}-${item.title}-${item.details}-${item.start_time}-${item.end_time}`;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, []);
      }
      groupsMap.get(key).push(item);
    }
  });

  const finalItems = [...independentItems];
  groupsMap.forEach((groupItems, key) => {
    if (groupItems.length === 1) {
      finalItems.push({ ...groupItems[0], isGroup: false, id: groupItems[0].uuid });
    } else {
      groupItems.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
      
      finalItems.push({
        isGroup: true,
        id: `group-${key}`,
        groupKey: key,
        bookings: groupItems,
        title: groupItems[0].title,
        room_uuid: groupItems[0].room_uuid,
        user_uuid: groupItems[0].user_uuid,
        username: groupItems[0].name,
        start_time: groupItems[0].start_time,
        end_time: groupItems[0].end_time,
        start_date: groupItems[0].start_date,
        end_date: groupItems[groupItems.length - 1].start_date,
        count: groupItems.length
      });
    }
  });

  return finalItems.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
});

const getRoomName = (roomUuid) => {
  const room = props.rooms.find(r => r.uuid === roomUuid);
  return room ? room.name : 'Sala desconocida';
};

const getRoomObject = (roomUuid) => {
  return props.rooms.find(r => r.uuid === roomUuid) || null;
};

const getRoomFacility = (roomUuid) => {
  const room = props.rooms.find(r => r.uuid === roomUuid);
  if (!room) return null;
  return props.facilities.find(f => f.uuid === room.facility_uuid) || null;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const handleStatusCheck = (booking, status) => {
  emit('update-status', { uuid: booking.uuid, status });
};

const handleBatchAction = async (group, status) => {
  const promises = group.bookings.map(b => {
      return emit('update-status', { uuid: b.uuid, status });
  });
  await Promise.all(promises);
};

const selectedDateFormatted = computed(() => {
  if (!selectedDate.value || selectedDate.value.length === 0) return '';

  const dates = selectedDate.value;
  const start = new Date(dates[0]);
  const end = new Date(dates[dates.length - 1]);

  if (dates.length === 1) {
    return start.toLocaleDateString('es-ES');
  }

  return `${start.toLocaleDateString('es-ES')} - ${end.toLocaleDateString('es-ES')}`;
});

const clearDate = () => {
  selectedDate.value = [];
};

const setToday = () => {
  const today = new Date();
  selectedDate.value = [today, today];
  menu.value = false;
};

const setThisWeek = () => {
  const today = new Date();
  const first = new Date(today);
  const last = new Date(today);
  const day = today.getDay() || 7;
  first.setDate(today.getDate() - day + 1);
  last.setDate(first.getDate() + 6);

  selectedDate.value = [first, last];
  menu.value = false;
};

const setThisMonth = () => {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  selectedDate.value = [first, last];
  menu.value = false;
};

const overlappingBookings = computed(() => {
  const overlaps = new Set();
  const getMinutes = time => time.split(':').map(Number).reduce((h,m)=>h*60+m,0);

  for (let i = 0; i < filteredBookings.value.length; i++) {
    for (let j = i+1; j < filteredBookings.value.length; j++) {
      const a = filteredBookings.value[i], b = filteredBookings.value[j];
      if (a.room_uuid !== b.room_uuid) continue;
      if (new Date(a.start_date).toDateString() !== new Date(b.start_date).toDateString()) continue;
      if (getMinutes(a.start_time) < getMinutes(b.end_time) && getMinutes(b.start_time) < getMinutes(a.end_time)) {
        overlaps.add(a.uuid); overlaps.add(b.uuid);
      }
    }
  }
  return overlaps;
});

const attemptApprove = (booking) => {
  if (overlappingBookings.value.has(booking.uuid)) {
    modalBooking.value = booking;
    confirmModal.value = true;
  } else {
    handleStatusCheck(booking, 'Approved');
  }
};

const confirmApproval = () => {
  if (!modalBooking.value) return;
  handleStatusCheck(modalBooking.value, 'Approved');

  modalBooking.value = null;
  confirmModal.value = false;
};

const cancelApproval = () => {
  modalBooking.value = null;
  confirmModal.value = false;
};
</script>

<style scoped>
.booking-validation-list-container {
  margin-top: 0.5rem;
}

.filter-container {
  margin-bottom: 0.5rem;
}

.booking-table {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: rgba(0, 0, 0, 0.05) 0px 1px 2px 0px;
}

.actions-container {
  display: flex;
  justify-content: center;
  gap: 4px;
}

.gap-2 {
  gap: 8px;
}

:deep(.v-data-table-header__content) {
  font-weight: 600 !important;
  color: #666;
}

:deep(.v-chip) {
  font-weight: 500;
}
</style>
