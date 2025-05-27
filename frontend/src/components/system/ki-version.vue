<script>
import { ref, onMounted } from 'vue';
import Request from "@/model/request";
import { useNotificationStore } from '@/store';
import { kiLoader } from '../loaders';

export default {
  name: 'kiVersion',
  components: { kiLoader},
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
  <v-chip v-else><kiLoader :active="true"/></v-chip>
</template>
