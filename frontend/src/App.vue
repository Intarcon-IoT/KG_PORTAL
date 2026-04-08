<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useSyncStore } from '@/store';
import { RouterView } from 'vue-router';

const syncStore = useSyncStore();

onMounted(() => {
  syncStore.initSync();
});

onUnmounted(() => {
  syncStore.cleanup();
});
</script>

<template>
  <v-app>
    <RouterView />
  </v-app>
</template>
