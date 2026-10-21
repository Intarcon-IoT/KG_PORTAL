<script setup>
import { ref } from 'vue'
import authLayout from '@/components/auth-layout.vue'
import { textField, formField } from '@/components/form-components'
import { useNotificationStore } from '@/store'
import Request from '@/model/request'
import validate from '@/utils/useValidationRules'

const notificationStore = useNotificationStore()

const form = ref(null)
const loading = ref(false)
const sent = ref(false)
const email = ref('')

const submit = async () => {
  const { valid } = await form.value.validate()
  if (!valid || loading.value) return
  loading.value = true
  try {
    await new Request({ endpoint: 'password-reset/request-password-reset', method: 'POST', body: JSON.stringify({ email: email.value }) }).http()
    sent.value = true
  } catch {
    notificationStore.notifyError('No se ha podido enviar el correo de recuperación')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <authLayout v-if="!sent" title="Recupera tu contraseña" subtitle="Indica tu correo y te enviaremos un enlace para crear una nueva.">
    <v-form ref="form" class="auth-form" @submit.prevent="submit">
      <formField label="Correo electrónico" column>
        <textField
          v-model="email"
          type="email"
          placeholder="nombre@empresa.com"
          autofocus
          :rules="[validate.required, validate.email]"
        />
      </formField>

      <v-btn type="submit" color="#111111" variant="flat" block class="auth-submit" :loading="loading">Enviar enlace</v-btn>
    </v-form>

    <template #footer>
      <router-link to="/login" class="auth-link">Volver a iniciar sesión</router-link>
    </template>
  </authLayout>

  <authLayout v-else title="Revisa tu correo">
    <template #badge>
      <span class="sent-icon"><i class="fa-regular fa-envelope" /></span>
    </template>

    <div class="sent">
      <p>Si <strong>{{ email }}</strong> está registrado, recibirás un enlace para restablecer la contraseña.</p>
      <p class="sent-note">El enlace caduca a los 10 minutos. Si no lo ves, mira en la carpeta de correo no deseado.</p>
    </div>

    <v-btn to="/login" color="#111111" variant="flat" block class="auth-submit">Volver a iniciar sesión</v-btn>

    <template #footer>
      ¿No te ha llegado? <a class="auth-link" @click="sent = false">Enviar de nuevo</a>
    </template>
  </authLayout>
</template>

<style scoped>
.sent { display: flex; flex-direction: column; gap: 1rem; margin-top: -1rem; margin-bottom: 1rem; line-height: 1.6; color: #334155 }.sent p { margin: 0 }
.sent strong { color: #111111; font-weight: 600; word-break: break-all }
.sent-note { font-size: .875rem; color: #64748b }
.sent-icon { display: grid; place-items: center; width: 52px; height: 52px; margin-bottom: 1.5rem; border-radius: 14px; background: #f0f7ec; color: #468131; font-size: 1.35rem }
</style>
