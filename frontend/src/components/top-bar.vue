<script>
import { ref } from 'vue';
import appLogo from './app-logo.vue'
import { sessionStore, useNotificationStore, useBookingStore } from '@/store';
import router from '@/router';
import { ROLES } from '@/utils/constants';

// import { appVersion } from '@/components/system';

  export default {
    name: 'topBar',
    components: {
      appLogo,
      // appVersion
    },
    setup() {
      const auth = sessionStore().auth;
      const session = sessionStore();
      const notificationStore = useNotificationStore();

      const isActive = ref(false);
      const bookingStore = useBookingStore();

      const email = ref(auth.user?.mail);

      const handleLogout = () => {
        auth.logout().then(() => {
          notificationStore.notifySuccess('Cierre de sesión exitoso');
          router.push({ name: 'Log In' });
        })
      }

      const handleMyAccount = () => {
        router.push({ name: 'Mi Cuenta' });
      }

      return {
        isActive,
        handleLogout,
        handleMyAccount,
        email,
        session,
        bookingStore,
        ROLES,
        handleGoToValidation: () => router.push({ name: 'Validar Reservas' })
      }
    }
  }
</script>

<template>
  <v-toolbar class="main-topbar">
    <div class="logo-container" @click="$emit('toggle-menu')">
      <appLogo :size="8.7" sm />
      <button class="menu-btn">
        <i class="fa-solid fa-bars-staggered"></i>
      </button>
    </div>
    <v-spacer />

    <v-badge
      v-if="session.auth.user?.role === ROLES.ADMIN"
      :content="bookingStore.pendingCount"
      :model-value="bookingStore.pendingCount > 0"
      color="error"
      overlap
      class="mr-4"
    >
      <v-btn
        icon
        variant="tonal"
        color="blue-grey-darken-3"
        density="comfortable"
        @click="handleGoToValidation"
        title="Validaciones pendientes"
      >
        <v-icon icon="fa-solid fa-inbox"></v-icon>
      </v-btn>
    </v-badge>

    <v-btn class="btn-dropdown bg-primary" rounded="xl" color="white">
      <div class="dropdown">
        <v-icon icon="fas fa-user"></v-icon>

        <v-icon v-if="isActive" icon="fas fa-chevron-circle-up"></v-icon>
        <v-icon v-else icon="fas fa-chevron-circle-down"></v-icon>
      </div>
      
      <v-menu activator="parent" v-model="isActive">
        <v-list class="dropdown-list">

          <v-list-item class="flex-center">
            <div>
              <!-- <appVersion/> -->
              <strong class="user-email">{{ email }}</strong>
            </div>
          </v-list-item>

          <v-list-item @click="handleMyAccount()" class="list-item">
            <div class="list-item-flex wh-max">
              <v-icon icon="fas fa-user" size="small"></v-icon>
              <v-list-item-title>Mi Cuenta</v-list-item-title>
            </div>
          </v-list-item>

          <v-list-item @click="handleLogout()" class="list-item">
            <div class="list-item-flex wh-max">
              <v-icon icon="fas fa-sign-out-alt" size="small"></v-icon>
              <v-list-item-title>Cerrar sesión</v-list-item-title>
            </div>
          </v-list-item>

        </v-list>
      </v-menu>
      </v-btn>

  </v-toolbar>

</template>

<style lang="css">
.logo-container {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.menu-btn {
  background: none;
  border: none;
  color: rgb(0, 0, 0);
  cursor: pointer;
  margin-left: 15px;
  margin-right: 5px;
  font-size: 1.5rem;
}

.btn-dropdown {
  margin-right: 1em!important;
}

.dropdown-list {
  background-color: var(--slate-light)!important;
  padding: .4rem;
}

.main-topbar {
  background-color: var(--slate-light)!important; 
  border-bottom: 1px solid var(--slate-dark)!important;
}

.dropdown {
  gap: .5rem;
  flex-wrap: nowrap;
  display: flex;
}

.list-item {
  min-width: 150px;
  cursor: pointer;
  border-radius: 5px!important;
  color: var(--primary-color)!important;
}

.list-item:hover {
  background-color: var(--dropdown-color-hover);
}

.list-item div {
  justify-content: flex-start; 
}

.list-item-flex {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 12px;
}
  
.chips {
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--white-color);
}

.user-email {
  font-size: 0.85rem;
  color: #555;
  padding: 6px 12px;
  border-bottom: 1px solid #eee;
  margin-bottom: 8px;
}
</style>
