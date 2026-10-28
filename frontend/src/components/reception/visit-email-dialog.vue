<!-- Añadir el email de un visitante. Se escribe a través de la visita (regla 195): si falta más de 1 hora, Odoo le manda
     la información previa con su enlace de firma -->
<script setup>
import { computed, ref, watch } from 'vue'
import appDialog from '@/components/app-dialog.vue'
import { textField } from '@/components/form-components'
import { isEmail, odooMs } from '@/utils/visits'

const props = defineProps({
  person: { type: Object, default: null },
  visit: { type: Object, default: null },
})
const open = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['save'])

const email = ref('')
const error = ref('')
watch(open, isOpen => { if (isOpen) { email.value = ''; error.value = '' } })

const inTime = computed(() => props.visit && odooMs(props.visit.date) - Date.now() > 3600000)

const save = () => {
  if (!isEmail(email.value.trim())) return (error.value = 'Escribe un email válido')
  emit('save', email.value.trim())
}
</script>

<template>
  <appDialog v-model="open" eyebrow="Recepción" title="Añadir email" :subtitle="`${person?.name || ''} · ${person?.registered ? 'contacto sin email' : 'no registrado'}${visit?.name ? ` · ${visit.name}` : ''}`" :width="460">
    <textField v-model="email" type="email" placeholder="nombre@empresa.com" autofocus @update:model-value="error = ''" @keydown.enter.prevent="save" />
    <p v-if="error" class="err">{{ error }}</p>
    <p class="kg-note info">
      {{ inTime
        ? 'Se guarda en su ficha de la visita y Odoo le envía la información previa (normas, WiFi, dirección) con su enlace de firma.'
        : 'Falta menos de 1 hora: no se envía correo previo. Firmará en la tablet al llegar.' }}
      {{ person?.registered ? 'No cambia el email de su contacto en Contactos.' : 'No se crea ningún contacto.' }}
    </p>
    <template #actions>
      <v-btn variant="outlined" class="kg-btn kg-btn-ghost" @click="open = false">Cancelar</v-btn>
      <v-btn color="primary" variant="flat" class="kg-btn" @click="save">Guardar email</v-btn>
    </template>
  </appDialog>
</template>

<style scoped>
.err { margin: 4px 0 0; color: #b91c1c; font-size: .8rem }
.info { margin-top: 12px; padding: 10px 12px; border-radius: 10px; background: #eff6ff; color: #1e3a8a; font-size: .82rem }
</style>
