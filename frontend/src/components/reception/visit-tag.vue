<!-- Etiqueta de estado de recepción: texto con el tono (ok, info, warning, danger, muted) -->
<script setup>
defineProps({
  text: { type: String, required: true },
  tone: { type: String, default: 'muted' },
})
</script>

<template>
  <span class="vtag" :class="tone">{{ text }}</span>
</template>

<style scoped>
.vtag { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: .72rem; font-weight: 600; line-height: 1.5; white-space: nowrap }
.ok { background: #eef4ea; color: #33662d }
.info { background: #eff6ff; color: #1d4ed8 }
.warning { background: #fff7ed; color: #b45309 }
.danger { background: #fef2f2; color: #b91c1c }
.muted { background: #f1f2f4; color: #64748b }
</style>
