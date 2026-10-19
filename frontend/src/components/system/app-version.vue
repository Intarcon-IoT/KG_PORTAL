<script>
import { ref, onMounted } from 'vue';
import Request from "@/model/request";
import { useNotificationStore } from '@/store';
import { appLoader } from '../loaders';

export default {
  name: 'appVersion',
  components: { appLoader},
  setup() {
    const version = ref(null);
    const notificationStore = useNotificationStore();

    onMounted(async () => {
      const request = new Request({
        endpoint: 'system/version',
        method: 'GET'
      });
      try {
        const res = await request.http();
        version.value = res.version;
      } catch (err) {
        notificationStore.notifyError(err.message);
      }
    });

    return {
      version
    };
  }
};
</script>

<template>
  <v-chip v-if="version">v.{{ version }}</v-chip>
  <v-chip v-else><appLoader :active="true"/></v-chip>
</template>
