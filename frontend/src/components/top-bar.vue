<script>
import { ref } from 'vue';
import kiLogo from './ki-logo.vue'
import { sessionStore, useNotificationStore } from '@/store';
import router from '@/router';
// import { kiVersion } from '@/components/system';

  export default {
    name: 'topBar',
    components: {
      kiLogo,
      // kiVersion
    },
    setup() {
      const auth = sessionStore().auth;
      const notificationStore = useNotificationStore();

      const isActive = ref(false);

      const handleLogout = () => {
        auth.logout().then(() => {
          notificationStore.notifySuccess('Cierre de sesión exitoso');
          router.push({ name: 'Log In' });
        })
      }

      return {
        isActive,
        handleLogout
      }
    }
  }
</script>

<template>
  <v-toolbar class="main-topbar">
    <div class="logo-container" @click="$emit('toggle-menu')">
      <kiLogo :size="8.7" sm />
      <button class="menu-btn">
        <i class="fa-solid fa-bars-staggered"></i>
      </button>
    </div>
    <v-spacer />
    <v-btn class="btn-dropdown bg-primary" rounded="xl" color="white">
      <div class="dropdown">
        <v-icon icon="fas fa-user"></v-icon>

        <v-icon v-if="isActive" icon="fas fa-chevron-circle-up"></v-icon>
        <v-icon v-else icon="fas fa-chevron-circle-down"></v-icon>
      </div>
      
      <v-menu activator="parent" v-model="isActive">
        <v-list class="dropdown-list">

          <!-- <v-list-item class="flex-center">
            <div class="chips">
              <kiVersion/>
            </div>
          </v-list-item> -->

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
  width: 5%;
}

.menu-btn {
  background: none;
  border: none;
  color: rgb(0, 0, 0);
  cursor: pointer;
  margin-left: 5px;
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
  justify-content: space-between;
}

.list-item-flex {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: -5rem;
}
  
.chips {
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--white-color);
}

</style>