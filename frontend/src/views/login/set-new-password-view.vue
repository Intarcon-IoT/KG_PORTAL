<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import authLayout from '@/components/auth-layout.vue'
import { textField, formField } from '@/components/form-components'
import { useNotificationStore } from '@/store'
import Request from '@/model/request'
import router from '@/router'
import validate from '@/utils/useValidationRules'
import { readResetToken } from '@/router/guard'

const notificationStore = useNotificationStore()
const token = readResetToken(useRoute())
// Se quita de la barra de direcciones en cuanto se lee
history.replaceState(history.state, '', location.pathname)

const form = ref(null)
const loading = ref(false)
const show = ref({ password: false, confirm: false })
const password = ref('')
const confirm = ref('')

const eyeIcon = visible => visible ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'

const submit = async () => {
  const { valid } = await form.value.validate()
  if (!valid || loading.value) return
  loading.value = true
  // El token del enlace va en el body: no es una sesión y no toca la que hubiera abierta
  try {
    await new Request({ endpoint: 'password-reset/reset-password', method: 'PUT', body: JSON.stringify({ token, newPassword: password.value }) }).http()
    notificationStore.notifySuccess('Contraseña actualizada. Ya puedes iniciar sesión')
    router.push('/login')
  } catch (err) {
    notificationStore.notifyError(err?.message || 'No se ha podido actualizar la contraseña')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <authLayout title="Nueva contraseña" subtitle="Elige una contraseña de al menos 8 caracteres que no uses en otros servicios.">
    <v-form ref="form" class="auth-form" @submit.prevent="submit">
      <formField label="Nueva contraseña" column>
        <textField
          v-model="password"
          placeholder="Mínimo 8 caracteres"
          autofocus
          :type="show.password ? 'text' : 'password'"
          :append-inner-icon="eyeIcon(show.password)"
          :rules="[validate.required, validate.password]"
          @click:append-inner="show.password = !show.password"
        />
      </formField>

      <formField label="Repite la contraseña" column>
        <textField
          v-model="confirm"
          placeholder="Vuelve a escribirla"
          :type="show.confirm ? 'text' : 'password'"
          :append-inner-icon="eyeIcon(show.confirm)"
          :rules="validate.confirmPassword(password)"
          @click:append-inner="show.confirm = !show.confirm"
        />
      </formField>

      <v-btn type="submit" color="#111111" variant="flat" block class="auth-submit" :loading="loading">Guardar contraseña</v-btn>
    </v-form>

    <template #footer>
      <router-link to="/login" class="auth-link">Volver a iniciar sesión</router-link>
    </template>
  </authLayout>
</template>
