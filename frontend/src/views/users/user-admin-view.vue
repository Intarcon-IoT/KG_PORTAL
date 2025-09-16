<template>
  <div class="users-admin-container">
    <div class="users-admin-header">
      <h1>Gestión de Usuarios</h1>
      <v-btn 
        color="primary" 
        prepend-icon="fa fa-plus" 
        @click="showUserForm = true" 
        v-if="!showUserForm"
      >
        Nuevo Usuario
      </v-btn>
    </div>

    <v-slide-y-transition>
      <div class="form-container" v-if="showUserForm">
        <div class="form-header">
          <h2>{{ isEditing ? 'Editar Usuario' : 'Crear Nuevo Usuario' }}</h2>
          <v-btn 
            icon="fa fa-times" 
            variant="text" 
            density="comfortable" 
            @click="handleCancelForm"
          >
          </v-btn>
        </div>
        <user-form
          context="admin"
          :mode="formMode"
          :value="selectedUser"
          @saved="handleSaveUser"
          @cancel="handleCancelForm"
        />
      </div>
    </v-slide-y-transition>

    <v-card class="users-table-container">
      <user-admin-list 
        :users="usersList" 
        :loading="loading"
        @edit="handleEditUser"
        @delete="handleDeleteUser"
      />
    </v-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import UserForm from '@/components/forms/user-form.vue';
import UserAdminList from '@/components/lists/user-admin-list.vue';
import { useNotificationStore } from '@/store';
import Request from "@/model/request";

const notification = useNotificationStore();

const usersList = ref([]);
const loading = ref(false);
const showUserForm = ref(false);
const selectedUser = ref(null);
const isEditing = ref(false);

const formMode = computed(() => isEditing.value ? 'edit' : 'create');

onMounted(() => {
  loadUsers();
});

async function loadUsers() {
  loading.value = true;
  try {
    const request = new Request({
      endpoint: 'users',
      method: 'GET'
    });

    const response = await request.http();
    usersList.value = response || [];
  } catch (error) {
    notification.notifyError('Error al cargar usuarios');
  } finally {
    loading.value = false;
  }
}

const handleEditUser = (user) => {
  selectedUser.value = user;
  isEditing.value = true;
  showUserForm.value = true;

  setTimeout(() => {
    window.scrollTo({ 
      top: 0, 
      behavior: 'smooth' 
    });
  }, 10);
};

const handleSaveUser = (payload) => {
  if (isEditing.value) {
    handleUpdateUser(payload);
  } else {
    handleCreateUser(payload);
  }
};

const handleCreateUser = async (payload) => {
  showUserForm.value = false;
  try {
    const request = new Request({
      endpoint: 'users',
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    await request.http();
    notification.notifySuccess('Usuario creado correctamente');
    loadUsers();
  } catch (error) {
    notification.notifyError('Error al crear usuario');
  }
};

const handleUpdateUser = async (payload) => {
  showUserForm.value = false;
  try {
    const request = new Request({
      endpoint: `users/${selectedUser.value.uuid}`,
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    
    await request.http();
    notification.notifySuccess('Usuario actualizado correctamente');
    loadUsers();
    resetForm();
  } catch (error) {
    notification.notifyError('Error al actualizar usuario');
    console.error('Error updating user:', error);
  }
};

const handleCancelForm = () => {
  showUserForm.value = false;
  resetForm();
};

const resetForm = () => {
  selectedUser.value = null;
  isEditing.value = false;
};

const handleDeleteUser = async (user) => {
  try {
    const request = new Request({
      endpoint: `users/${user.uuid}`,
      method: 'DELETE'
    });
    
    await request.http();
    notification.notifySuccess('Usuario eliminado correctamente');
    loadUsers();
  } catch (error) {
    notification.notifyError('Error al eliminar usuario');
  }
};
</script>

<style scoped>
.users-admin-container {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.users-admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.users-admin-header h1 {
  font-size: 1.75rem;
  font-weight: 500;
  color: var(--primary-dark, #333);
  margin: 0;
}

.form-container {
  background-color: var(--white-transparent-xs, #ffffff);
  border-radius: 8px;
  box-shadow: rgba(0, 0, 0, 0.1) 0px 1px 3px 0px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  border-left: 4px solid var(--primary, #5BB133);
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.form-header h2 {
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--primary, #5BB133);
  margin: 0;
}

.users-table-container {
  background-color: var(--white-transparent-xs, #ffffff);
  border-radius: 8px;
  padding: 1rem;
}

@media (max-width: 768px) {
  .users-admin-container {
    padding: 1rem;
  }
  
  .users-admin-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .users-admin-header button {
    align-self: stretch;
  }
  
  .form-container {
    padding: 1rem;
  }
}
</style>
