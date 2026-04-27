<template>
  <div class="user-list-container">

    <div class="filter-container">
      <v-text-field
        v-model="search"
        prepend-inner-icon="fa fa-search"
        label="Buscar usuarios por nombre o email"
        density="comfortable"
        variant="outlined"
        class="search-field"
        clearable
      ></v-text-field>
    </div>
    
    <v-data-table
      :headers="headers"
      :items="props.users"
      :loading="loading"
      :search="search"
      class="elevation-1 rounded-lg user-table"
      density="comfortable"
      :no-data-text="loading ? 'Cargando usuarios...' : 'No se encontraron usuarios'"
    >

      <template v-slot:item.role="{ item }">
        <v-chip
          size="small"
          :color="getRoleColor(item.role)"
        >
          {{ item.role }}
        </v-chip>
      </template>

      <template v-slot:item.tenant_name="{ item }">
        <v-chip
          v-if="item.tenant_name"
          size="small"
          color="secondary"
          variant="outlined"
        >
          {{ item.tenant_name }}
        </v-chip>
        <span v-else class="text-grey-lighten-1" style="font-size: 0.85rem;">
          No asignado
        </span>
      </template>
      <template v-slot:item.actions="{ item }">
        <div class="actions-container">
          <v-tooltip text="Editar usuario">
            <template v-slot:activator="{ props }">
              <v-btn
                icon
                color="blue-grey"
                variant="text"
                v-bind="props"
                :disabled="!canModifyUser(item)"
                @click="handleEdit(item)"
              >
                <i class="fa-solid fa-pen-to-square"></i>
              </v-btn>
            </template>
          </v-tooltip>
          <v-tooltip text="Eliminar usuario">
            <template v-slot:activator="{ props }">
              <v-btn
                icon
                color="error"
                variant="text"
                v-bind="props"
                :disabled="!canModifyUser(item)"
                @click="handleDelete(item)"
              >
                <i class="fa-solid fa-trash"></i>
              </v-btn>
            </template>
          </v-tooltip>
        </div>
      </template>

      <template v-slot:no-data>
        <div class="d-flex flex-column align-center py-4">
          <i class="fa-solid fa-users-slash text-grey-lighten-1 mb-2" style="font-size: 2rem;"></i>
          <span v-if="loading">Cargando usuarios...</span>
          <span v-else-if="search">No se encontraron resultados para "{{ search }}"</span>
          <span v-else>No hay usuarios disponibles</span>
        </div>
      </template>
    </v-data-table>

    <v-dialog v-model="deleteDialog" max-width="500">
      <v-card class="pa-6 rounded-xl">
        <div class="action-buttons">
          <v-btn icon size="small" aria-label="Cerrar" @click="deleteDialog = false">
            <i class="fa-solid fa-xmark"></i>
          </v-btn>
        </div>

        <v-card-title class="text-h6 font-weight-bold text-grey-darken-3 pa-0 mb-4">
          <div class="title-container">
            <span class="booking-title">Confirmar eliminación</span>
          </div>
        </v-card-title>

        <v-card-text class="pa-0">
          <div class="info-line mb-2" v-if="deletionImpact > 0">
            <i class="fa-solid fa-envelope mr-3"></i>
            <span>Este usuario tiene <strong>{{ deletionImpact }} reservas asociadas</strong>. Al eliminarlo tambien se borrarán todas sus reservas.</span>
          </div>

          <div class="info-line mb-3">
            <i class="fa-solid fa-circle-exclamation mr-3"></i>
            <span>¿Está seguro de que desea eliminar al usuario <strong>{{ userToDelete?.name }}</strong>?</span>
          </div>
          
        </v-card-text>
        
        <v-card-actions class="pa-0 mt-5">
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="outlined" class="mr-2" @click="deleteDialog = false">
            Cancelar
          </v-btn>
          <v-btn color="error" variant="elevated" @click="confirmDelete">
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { sessionStore } from '@/store';
import Request from '@/model/request';
import { ROLES } from '@/utils/constants';

const props = defineProps({
  users: {
    type: Array,
    required: true,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['edit', 'delete']);

const session = sessionStore();
const currentUserId = computed(() => session.auth.user?.uuid);
const search = ref('');
const deletionImpact = ref(0);

const headers = [
  { title: 'Nombre', key: 'name', sortable: true },
  { title: 'Email', key: 'mail', sortable: true },
  { title: 'Rol', key: 'role', sortable: true },
  { title: 'Grupo', key: 'tenant_name', sortable: true },
  { title: 'Acciones', key: 'actions', sortable: false, align: 'end' }
];

const getRoleColor = (role) => {
  switch (role) {
    case ROLES.ADMIN: return 'primary';
    case ROLES.GESTOR: return 'warning';
    default: return 'grey';
  }
};

const deleteDialog = ref(false);
const userToDelete = ref(null);

const handleDelete = async(user) => {
  try {
    const request = new Request({
      endpoint: `users/${user.uuid}/deletion-impact`,
      method: 'GET'
    });
    const response = await request.http();
    deletionImpact.value = response.bookings;

  }catch (error) {
    console.error('Error fetching deletion impact:', error);
  }


  userToDelete.value = user;
  deleteDialog.value = true;
};

const confirmDelete = () => {
  emit('delete', userToDelete.value);
  deleteDialog.value = false;
  userToDelete.value = null;
};

const handleEdit = (user) => {
  emit('edit', user);
};

const canModifyUser = (targetUser) => {
  const currentUser = session.auth.user;

  if (!currentUser) return false;

  if (targetUser.uuid === currentUser.uuid) return false;

  if (currentUser.role === ROLES.GESTOR) {
    if (
      targetUser.role === ROLES.GESTOR ||
      targetUser.role === ROLES.ADMIN
    ) {
      return false;
    }
  }

  return true;
};
</script>

<style scoped>
.user-list-container {
  margin-top: 1rem;
}

.filter-container {
  margin-bottom: 1rem;
}

.search-field {
  max-width: 400px;
}

.user-table {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: rgba(0, 0, 0, 0.1) 0px 1px 3px 0px;
}

.actions-container {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.action-buttons {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  z-index: 1;
}

.title-container {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px;
  max-width: 80%;
}

.booking-title {
  flex: 1 1 100%;
  word-break: break-word;
  white-space: normal;
}

.info-line {
  display: flex;
  align-items: center;
  font-size: 15px;
  color: #333;
}
</style>
