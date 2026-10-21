<!-- Diálogo común del portal: cabecera con título, volver y cerrar; cuerpo con estilo de formulario; pie de acciones -->
<script setup>
const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  eyebrow: { type: String, default: '' },
  width: { type: [Number, String], default: 520 },
  back: { type: Boolean, default: false },
  closable: { type: Boolean, default: true },
  // Icono destacado para confirmaciones: tone define su color
  icon: { type: String, default: '' },
  tone: { type: String, default: 'neutral', validator: v => ['neutral', 'danger', 'warning', 'success'].includes(v) },
})

const open = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['back', 'close'])

const close = () => {
  if (!props.closable) return
  open.value = false
  emit('close')
}
</script>

<template>
  <v-dialog v-model="open" :max-width="width" persistent scrollable transition="dialog-bottom-transition" @keydown.esc="close">
    <div class="kg-dialog" :class="`tone-${tone}`" role="dialog" :aria-label="title">
      <header class="kg-dialog-head">
        <button v-if="back" type="button" class="kg-icon-btn" aria-label="Volver" @click="emit('back')"><i class="fa-solid fa-arrow-left" /></button>
        <span v-if="icon" class="kg-dialog-icon"><i :class="icon" /></span>
        <div class="kg-dialog-titles">
          <span v-if="eyebrow" class="kg-dialog-eyebrow">{{ eyebrow }}</span>
          <h2>{{ title }}</h2>
          <p v-if="subtitle">{{ subtitle }}</p>
        </div>
        <div class="kg-dialog-tools">
          <slot name="tools" />
          <button v-if="closable" type="button" class="kg-icon-btn" aria-label="Cerrar" @click="close"><i class="fa-solid fa-xmark" /></button>
        </div>
      </header>

      <div class="kg-dialog-body kg-form">
        <slot />
      </div>

      <footer v-if="$slots.actions" class="kg-dialog-actions">
        <slot name="actions" />
      </footer>
    </div>
  </v-dialog>
</template>

<style scoped>
.kg-dialog { display: flex; flex-direction: column; max-height: calc(100dvh - 48px); overflow: hidden; border-radius: 16px; background: #ffffff; color: #111111; box-shadow: 0 24px 64px -24px rgba(15, 23, 42, .45) }

.kg-dialog-head { display: flex; align-items: flex-start; gap: 12px; padding: 20px 20px 14px 24px }
.kg-dialog-titles { flex: 1; min-width: 0; padding-top: 4px }
.kg-dialog-eyebrow { display: block; margin-bottom: 4px; font-size: .7rem; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: #468131 }
.kg-dialog-titles h2 { margin: 0; font-size: 1.15rem; font-weight: 600; line-height: 1.3; overflow-wrap: anywhere }
.kg-dialog-titles p { margin: 4px 0 0; font-size: .875rem; line-height: 1.5; color: #64748b }
.kg-dialog-tools { display: flex; align-items: center; gap: 2px; margin-left: auto }

.kg-dialog-icon { display: grid; place-items: center; flex-shrink: 0; width: 44px; height: 44px; border-radius: 12px; background: #f1f2f4; color: #334155; font-size: 1rem }
.tone-danger .kg-dialog-icon { background: #fef2f2; color: #b91c1c }
.tone-warning .kg-dialog-icon { background: #fff7ed; color: #c2410c }
.tone-success .kg-dialog-icon { background: #f1f5ee; color: #468131 }

.kg-dialog-body { flex: 1; min-height: 0; overflow-y: auto; padding: 6px 24px 20px; scrollbar-width: thin }

.kg-dialog-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 10px; padding: 14px 24px 20px; border-top: 1px solid #f1f2f4 }

@media (width < 600px) {
  .kg-dialog-head { padding: 16px 12px 12px 16px }
  .kg-dialog-body { padding: 4px 16px 16px }
  .kg-dialog-actions { padding: 12px 16px 16px }
  .kg-dialog-actions :deep(.v-btn) { flex: 1 }
}
</style>
