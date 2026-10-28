<!-- Ajustes de la cuenta propia: datos personales y cambio de contraseña -->
<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import appDialog from '@/components/app-dialog.vue'
import { textField, formField } from '@/components/form-components'
import { sessionStore, useNotificationStore } from '@/store'
import Request from '@/model/request'
import validate from '@/utils/useValidationRules'
import { ROLE_LABELS as roleLabel, initialsOf } from '@/utils/labels'

const router = useRouter()
const session = sessionStore()
const notification = useNotificationStore()

const user = computed(() => session.auth.user || {})
const initials = computed(() => initialsOf(user.value.name || user.value.mail))

const formRef = ref(null)
const form = reactive({ name: user.value.name || '', mail: user.value.mail || '', currentPassword: '', password: '', confirmPassword: '' })
const show = reactive({ current: false, password: false, confirm: false })
const eyeIcon = visible => visible ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'

const changingPassword = computed(() => !!form.password)
const dirty = computed(() => form.name !== (user.value.name || '') || form.mail !== (user.value.mail || '') || changingPassword.value)

const confirmOpen = ref(false)
const saving = ref(false)

const payload = () => {
  const data = { name: form.name, mail: form.mail }
  if (changingPassword.value) Object.assign(data, { password: form.password, currentPassword: form.currentPassword })
  return data
}

const requestSave = async () => {
  const { valid } = await formRef.value.validate()
  if (valid && dirty.value) confirmOpen.value = true
}

// Al guardar se cierra la sesión para que el token lleve los datos nuevos
const save = async () => {
  saving.value = true
  try {
    const response = await new Request({ endpoint: `users/${user.value.uuid}`, method: 'PUT', body: JSON.stringify(payload()) }).http()
    if (!response.ok) return notification.notifyError('No se ha podido actualizar la cuenta')
    confirmOpen.value = false
    await session.auth.logout()
    notification.notifySuccess('Cuenta actualizada. Vuelve a iniciar sesión')
    router.push('/login')
  } catch {
    notification.notifyError('No se ha podido actualizar la cuenta')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="account">
    <header class="account-head">
      <span class="account-avatar">{{ initials }}</span>
      <div class="account-id">
        <span class="account-eyebrow">Mi cuenta</span>
        <h1>{{ user.name }}</h1>
        <p>{{ user.mail }} <span class="account-role">{{ user.role_name || roleLabel[user.role] || user.role }}</span></p>
      </div>
    </header>

    <v-form ref="formRef" class="account-form" @submit.prevent="requestSave">
      <section class="card">
        <div class="card-intro">
          <h2>Datos personales</h2>
          <p>Tu nombre y el correo con el que inicias sesión en el portal.</p>
        </div>
        <div class="card-fields kg-form">
          <formField label="Nombre" column>
            <textField v-model="form.name" placeholder="Nombre y apellidos" :rules="[validate.required]" />
          </formField>
          <formField label="Correo electrónico" column>
            <textField v-model="form.mail" type="email" placeholder="nombre@empresa.com" :rules="[validate.required, validate.email]" />
          </formField>
        </div>
      </section>

      <section class="card">
        <div class="card-intro">
          <h2>Contraseña</h2>
          <p>Déjalo en blanco si no quieres cambiarla. La nueva debe tener al menos 8 caracteres.</p>
        </div>
        <div class="card-fields kg-form">
          <formField label="Contraseña actual" column>
            <textField
              v-model="form.currentPassword"
              placeholder="Tu contraseña actual"
              :type="show.current ? 'text' : 'password'"
              :append-inner-icon="eyeIcon(show.current)"
              :rules="[v => !changingPassword || !!v || 'Indica tu contraseña actual']"
              @click:append-inner="show.current = !show.current"
            />
          </formField>
          <div class="kg-row">
            <formField label="Nueva contraseña" column>
              <textField
                v-model="form.password"
                placeholder="Mínimo 8 caracteres"
                :type="show.password ? 'text' : 'password'"
                :append-inner-icon="eyeIcon(show.password)"
                :rules="[validate.password]"
                @click:append-inner="show.password = !show.password"
              />
            </formField>
            <formField label="Repite la contraseña" column>
              <textField
                v-model="form.confirmPassword"
                placeholder="Vuelve a escribirla"
                :type="show.confirm ? 'text' : 'password'"
                :append-inner-icon="eyeIcon(show.confirm)"
                :rules="validate.confirmPassword(form.password)"
                @click:append-inner="show.confirm = !show.confirm"
              />
            </formField>
          </div>
        </div>
      </section>

      <div class="account-actions">
        <v-btn variant="outlined" class="kg-btn kg-btn-ghost" @click="router.push('/calendar')">Cancelar</v-btn>
        <v-btn type="submit" color="primary" variant="flat" class="kg-btn" :disabled="!dirty">Guardar cambios</v-btn>
      </div>
    </v-form>

    <appDialog v-model="confirmOpen" title="Se cerrará tu sesión" icon="fa-solid fa-arrow-right-from-bracket" tone="success" :width="440" :closable="!saving">
      <p class="kg-note">Para aplicar los cambios tendrás que volver a iniciar sesión{{ form.mail !== user.mail ? ' con tu nuevo correo' : '' }}.</p>
      <template #actions>
        <v-btn variant="outlined" class="kg-btn kg-btn-ghost" :disabled="saving" @click="confirmOpen = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" class="kg-btn" :loading="saving" @click="save">Guardar y cerrar sesión</v-btn>
      </template>
    </appDialog>
  </div>
</template>

<style scoped>
.account { max-width: 960px; margin: 0 auto; padding: 32px 24px 48px; color: #111111 }

/* Cabecera */
.account-head { display: flex; align-items: center; gap: 20px; margin-bottom: 28px }
.account-avatar { display: grid; place-items: center; flex-shrink: 0; width: 64px; height: 64px; border-radius: 50%; background: #5bb133; color: #0b1a05; font-size: 1.3rem; font-weight: 700 }
.account-id { min-width: 0 }
.account-eyebrow { display: block; margin-bottom: 2px; font-size: .72rem; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: #468131 }
.account-id h1 { margin: 0; font-size: 1.6rem; font-weight: 600; letter-spacing: -0.01em; line-height: 1.2 }
.account-id p { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 10px; margin: 4px 0 0; font-size: .9rem; color: #64748b; overflow-wrap: anywhere }
.account-role { padding: 2px 10px; border-radius: 999px; background: #eceef2; color: #334155; font-size: .75rem; font-weight: 600 }

/* Tarjetas de ajustes */
.account-form { display: flex; flex-direction: column; gap: 16px }
.card { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr); gap: 32px; padding: 28px; border: 1px solid #eceef2; border-radius: 14px; background: #ffffff }
.card-intro h2 { margin: 0 0 6px; font-size: 1rem; font-weight: 600 }
.card-intro p { margin: 0; font-size: .875rem; line-height: 1.6; color: #64748b }

/* Acciones */
.account-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 8px }

@media (width < 760px) {
  .account { padding: 20px 16px 32px }
  .account-head { gap: 14px }
  .account-avatar { width: 52px; height: 52px; font-size: 1.1rem }
  .account-id h1 { font-size: 1.3rem }
  .card { grid-template-columns: 1fr; gap: 18px; padding: 20px }
  .account-actions .kg-btn { flex: 1 }
}
</style>
