<!-- Versión del portal, incrustada al compilar desde el fichero VERSION de la raíz -->
<script>
export default {
  name: 'appVersion',
  data: () => ({ version: import.meta.env.VITE_APP_VERSION }),
}
</script>

<template>
  <span v-if="version" class="app-version" :aria-label="`Versión ${version}`">
    <span class="dot" />
    <span>v{{ version }}</span>
  </span>
</template>

<style scoped>
.app-version { display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 9px; border-radius: 999px; background: #f4f5f7; color: #64748b; font-size: .72rem; font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: .02em; white-space: nowrap }
.dot { width: 6px; height: 6px; border-radius: 50%; background: #5bb133 }
</style>
