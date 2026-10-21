<script setup>
import { ref } from 'vue'
import authLayout from '@/components/auth-layout.vue'
import { textField, formField } from '@/components/form-components'
import { sessionStore, useNotificationStore } from '@/store'
import router from '@/router'
import validate from '@/utils/useValidationRules'

const session = sessionStore()
const notificationStore = useNotificationStore()

const form = ref(null)
const loading = ref(false)
const showPassword = ref(false)
const credentials = ref({ email: '', password: '' })

const submit = async () => {
  const { valid } = await form.value.validate()
  if (!valid || loading.value) return
  loading.value = true
  const { email, password } = credentials.value
  session.auth.login({ email, password })
    .then(res => {
      session.setSession({ session: true, token: res.user.token, email, role: res.role, user: res.user })
      notificationStore.notifySuccess('Se ha iniciado sesión correctamente')
      router.replace('/calendar')
    })
    .catch(err => notificationStore.notifyError(err?.message || 'Credenciales no válidas'))
    .finally(() => { loading.value = false })
}
</script>

<template>
  <authLayout title="Inicia sesión" subtitle="Usa tu correo corporativo para acceder al portal.">
    <v-form ref="form" class="auth-form" @submit.prevent="submit">
      <formField label="Correo electrónico" column>
        <textField
          v-model="credentials.email"
          type="email"
          placeholder="nombre@empresa.com"
          autocomplete="username"
          autofocus
          :rules="[validate.required, validate.email]"
        />
      </formField>

      <formField label="Contraseña" column>
        <textField
          v-model="credentials.password"
          placeholder="Tu contraseña"
          autocomplete="current-password"
          :type="showPassword ? 'text' : 'password'"
          :append-inner-icon="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"
          :rules="[validate.required]"
          @click:append-inner="showPassword = !showPassword"
        />
      </formField>

      <div class="forgot">
        <router-link to="/forgot-password" class="auth-link">¿Has olvidado tu contraseña?</router-link>
      </div>

      <v-btn type="submit" color="#111111" variant="flat" block class="auth-submit" :loading="loading">Iniciar sesión</v-btn>
    </v-form>
  </authLayout>
</template>

<style scoped>
.forgot { display: flex; justify-content: flex-end; margin-top: -.5rem; font-size: .875rem }
</style>
