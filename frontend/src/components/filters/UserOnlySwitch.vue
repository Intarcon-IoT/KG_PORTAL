<script setup>
defineProps({ modelValue: Boolean })
defineEmits(['update:modelValue'])
</script>

<template>
  <label class="only-mine">
    <span>
      <strong>Solo mis reservas</strong>
      <small>Oculta las del resto de usuarios</small>
    </span>
    <v-switch :model-value="modelValue" color="#111111" density="compact" inset hide-details @update:model-value="$emit('update:modelValue', $event)" />
  </label>
</template>

<style scoped>
.only-mine { display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer }
.only-mine span { display: flex; flex-direction: column }
.only-mine strong { font-size: .85rem; font-weight: 600; color: #111111 }
.only-mine small { font-size: .75rem; color: #94a3b8 }
.only-mine :deep(.v-switch) { flex: 0 0 auto }
</style>
