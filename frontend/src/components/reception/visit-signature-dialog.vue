<!-- Firma del registro de visita en la tablet: QR con el enlace público de Odoo Sign -->
<script setup>
import { ref, watch } from 'vue'
import QRCode from 'qrcode'
import appDialog from '@/components/app-dialog.vue'
import { visitsApi } from '@/model/visits'
import { useNotificationStore } from '@/store'

const props = defineProps({
  person: { type: Object, default: null },
  visitName: { type: String, default: '' },
})
const open = defineModel({ type: Boolean, default: false })
const notification = useNotificationStore()

const signature = ref(null)
const qr = ref('')
const loading = ref(false)

watch(open, async isOpen => {
  if (!isOpen || !props.person) return
  signature.value = null
  qr.value = ''
  loading.value = true
  signature.value = await visitsApi.signature(props.person.id)
  if (signature.value?.url) qr.value = await QRCode.toDataURL(signature.value.url, { width: 440, margin: 1 })
  loading.value = false
}, { immediate: true })

const copy = async () => {
  try { await navigator.clipboard.writeText(signature.value.url); notification.notifySuccess('Enlace copiado') } catch { notification.notifyError('No se ha podido copiar el enlace') }
}
</script>

<template>
  <appDialog v-model="open" eyebrow="Recepción" title="Firma del registro de visita" :subtitle="`${person?.name || ''}${visitName ? ` · ${visitName}` : ''}`" :width="480">
    <p class="kg-note small">Documento «Registro de visita - KEYTER GROUP» (normas, EPIs, RGPD).</p>
    <div v-if="loading" class="center"><v-progress-circular indeterminate size="28" width="3" color="primary" /></div>
    <p v-else-if="!signature?.url" class="warn"><i class="fa-solid fa-triangle-exclamation" /> No hay enlace de firma para este visitante.</p>
    <div v-else class="center">
      <img :src="qr" alt="Código QR del enlace de firma" width="220" height="220" />
      <button type="button" class="copy" @click="copy"><i class="fa-regular fa-copy" /> Copiar enlace para la tablet</button>
    </div>
    <p class="kg-note info">
      {{ signature?.sign_on_tablet
        ? 'Firma con el contacto genérico «Visitante sin registrar»: escribe su nombre en el documento. El PDF firmado se queda en Sign y en su ficha; no se envía por correo.'
        : 'El visitante escanea el QR con su móvil o firma en la tablet abriendo el enlace. Al firmar, Odoo guarda el PDF firmado en su ficha y le envía una copia.' }}
    </p>
    <template #actions>
      <v-btn variant="outlined" class="kg-btn kg-btn-ghost" @click="open = false">Cerrar</v-btn>
    </template>
  </appDialog>
</template>

<style scoped>
.small { font-size: .82rem }
.center { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 12px 0 }
.copy { border: 0; background: none; color: #468131; font: inherit; font-size: .85rem; font-weight: 600; cursor: pointer }
.warn { padding: 10px 12px; border-radius: 10px; background: #fff7ed; color: #9a3412; font-size: .85rem }
.info { margin-top: 8px; padding: 10px 12px; border-radius: 10px; background: #eff6ff; color: #1e3a8a; font-size: .82rem }
</style>
