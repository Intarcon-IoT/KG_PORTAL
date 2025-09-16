<template>
  <div class="users-admin-container">
    <div class="users-admin-header">
      <h1>Mi Cuenta</h1>
    </div>
    <user-form
      mode="edit"
      context="self"
      :value="session.auth.user"
      @saved="handleFormSave"
      @cancel="handleFormCancel"
    />
  </div>

  <v-dialog v-model="showLogoutModal" max-width="500" transition="dialog-bottom-transition" persistent>
    <v-card class="pa-6 rounded-xl" style="position: relative;">

      <v-card-title class="text-h6 font-weight-bold text-grey-darken-3 pa-0 mb-4">
        <div class="title-container">
          <span class="booking-title">Reinicio de sesión</span>
        </div>
      </v-card-title>

      <v-card-text class="pa-0">
        <div class="info-line mb-3">
          <span>Su sesión se va a reiniciar para hacer efectivos los cambios.</span>
        </div>
        
        <div class="info-line mb-2">
          <span>¿Desea continuar?</span>
        </div>
      </v-card-text>
      
      <v-card-actions class="pa-0 mt-5">
        <v-spacer></v-spacer>
        <v-btn color="grey-darken-1" variant="outlined" class="mr-2" @click="showLogoutModal = false">
          Cancelar
        </v-btn>
        <v-btn color="primary" variant="elevated" @click="handleModalConfirm">
          Confirmar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import UserForm from '@/components/forms/user-form.vue';
import Request from "@/model/request";
import {useNotificationStore, sessionStore } from '@/store';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const showLogoutModal = ref(false);
const notification = useNotificationStore();
const session = sessionStore();
const router = useRouter();

const formData = ref({});

const handleFormSave = (formPayload) => {
  formData.value = formPayload;
  showLogoutModal.value = true;
};

const handleFormCancel = () => {
  router.push('/calendar');
};

const handleModalConfirm = async () => {
  try {
    const request = new Request({
      endpoint: `users/${session.auth.user.uuid}`,
      method: 'PUT',
      body: JSON.stringify(formData.value)
    });

    const response = await request.http();
    
    if (!response.ok) {
      showLogoutModal.value = false;
      notification.notifyError('Error al actualizar la cuenta.');
      return;
    }

    showLogoutModal.value = false;
    session.auth.logout();
    notification.notifySuccess('Cuenta actualizada correctamente.');
    router.push('/login');
  } catch (error) {
    notification.notifyError('Error al actualizar la cuenta.');
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
}
</style>
