<!-- Paginación común de las tablas: se usa en el slot #bottom de v-data-table -->
<script setup>
import { computed } from 'vue'

const props = defineProps({ total: { type: Number, required: true }, sizes: { type: Array, default: () => [10, 25, 50] } })
const page = defineModel('page', { type: Number, default: 1 })
const itemsPerPage = defineModel('itemsPerPage', { type: Number, default: 25 })

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / itemsPerPage.value)))
const from = computed(() => props.total ? (page.value - 1) * itemsPerPage.value + 1 : 0)
const to = computed(() => Math.min(page.value * itemsPerPage.value, props.total))

// Primera, última y las vecinas de la actual; el resto se resume con «…»
const pages = computed(() => {
  const n = pageCount.value, p = page.value
  if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1)
  const near = [p - 1, p, p + 1].filter(x => x > 1 && x < n)
  return [1, near[0] > 2 ? '…' : null, ...near, near.at(-1) < n - 1 ? '…' : null, n].filter(Boolean)
})

const go = target => { page.value = Math.min(Math.max(1, target), pageCount.value) }
const setSize = size => { itemsPerPage.value = size; page.value = 1 }
</script>

<template>
  <div class="pager">
    <div class="pager-size">
      <span>Mostrar</span>
      <div class="sizes">
        <button v-for="size in sizes" :key="size" type="button" :class="{ active: size === itemsPerPage }" @click="setSize(size)">{{ size }}</button>
      </div>
    </div>

    <span class="pager-range">{{ from }}–{{ to }} de {{ total }}</span>

    <nav v-if="pageCount > 1" class="pager-nav" aria-label="Paginación">
      <button type="button" class="arrow" :disabled="page === 1" aria-label="Página anterior" @click="go(page - 1)"><i class="fa-solid fa-chevron-left" /></button>
      <template v-for="(p, i) in pages" :key="`${p}-${i}`">
        <span v-if="p === '…'" class="gap">…</span>
        <button v-else type="button" :class="{ active: p === page }" :aria-current="p === page ? 'page' : undefined" @click="go(p)">{{ p }}</button>
      </template>
      <button type="button" class="arrow" :disabled="page === pageCount" aria-label="Página siguiente" @click="go(page + 1)"><i class="fa-solid fa-chevron-right" /></button>
    </nav>
  </div>
</template>

<style scoped>
.pager { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 20px; padding: 12px 16px; border-top: 1px solid #f1f2f4; font-size: .825rem; color: #64748b }

.pager-size { display: flex; align-items: center; gap: 8px }
.sizes { display: flex; padding: 2px; border: 1px solid #e5e7eb; border-radius: 8px }
.sizes button { height: 26px; min-width: 32px; padding: 0 8px; border: 0; border-radius: 6px; background: transparent; color: #64748b; font: inherit; font-size: .78rem; font-weight: 600; cursor: pointer }
.sizes button:hover { color: #111111 }
.sizes button.active { background: #111111; color: #ffffff }

.pager-range { margin-left: auto; font-variant-numeric: tabular-nums }

.pager-nav { display: flex; align-items: center; gap: 2px }
.pager-nav button { display: grid; place-items: center; height: 32px; min-width: 32px; padding: 0 6px; border: 0; border-radius: 8px; background: transparent; color: #334155; font: inherit; font-size: .825rem; font-weight: 600; font-variant-numeric: tabular-nums; cursor: pointer; transition: background-color .12s, color .12s }
.pager-nav button:hover:not(:disabled):not(.active) { background: #f1f2f4; color: #111111 }
.pager-nav button.active { background: #111111; color: #ffffff }
.pager-nav button:disabled { color: #cbd5e1; cursor: default }
.pager-nav .arrow { font-size: .7rem }
.gap { min-width: 20px; color: #94a3b8; text-align: center }

@media (width < 600px) {
  .pager-range { margin-left: 0 }
  .pager-nav { width: 100%; justify-content: center }
}
</style>
