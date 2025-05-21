<script>
import { RouterView } from 'vue-router';
import router from '@/router';
import { sessionStore, useNotificationStore } from '@/store';

export default {
  components: {
    RouterView
  },
  setup() {
    const notificationStore = useNotificationStore();

    const session = sessionStore();
    session.auth.loadAuth().catch(err => {
      session.auth.logout();
      notificationStore.notifyError(err.message);
      router.push({ name:'Log In'});
    });
  }
}
</script>

<template>
  <v-app>
    <v-main class="bg-gray-50">
      <RouterView />
    </v-main>
  </v-app>
</template>
