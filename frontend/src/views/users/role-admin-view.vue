<!-- Roles y sus permisos por defecto: todos los usuarios del rol los tienen, además de los suyos propios -->
<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import appDialog from '@/components/app-dialog.vue'
import UserPermissions from '@/components/forms/user-permissions.vue'
import { textField, formField } from '@/components/form-components'
import { useAccessStore, useNotificationStore } from '@/store'
import Request from '@/model/request'
import validate from '@/utils/useValidationRules'
import { ROLES } from '@/utils/constants'

const access = useAccessStore()
const notification = useNotificationStore()

onMounted(() => { access.fetchRoles(); access.fetchCatalog() })

const modulesOf = role => role.code === ROLES.ADMIN ? ['Todos'] : access.catalog.filter(m => m.actions.some(a => role.permissions.includes(a.key))).map(m => m.title)
const actionTitle = key => access.actions.find(a => a.key === key)
const detailOf = role => role.permissions.map(key => actionTitle(key)).filter(Boolean).map(a => `${a.module}: ${a.title.toLowerCase()}`)

// Alta y edición
const dialog = ref(false)
const saving = ref(false)
const editing = ref(null)
const formRef = ref(null)
const form = reactive({ name: '', description: '', permissions: [] })
const isAdminRole = computed(() => editing.value?.code === ROLES.ADMIN)

const open = role => {
  editing.value = role || null
  Object.assign(form, { name: role?.name || '', description: role?.description || '', permissions: [...(role?.permissions || [])] })
  dialog.value = true
}

const save = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  const body = { name: form.name, description: form.description || null, ...(isAdminRole.value ? {} : { permissions: form.permissions }) }
  saving.value = true
  try {
    const response = await new Request(editing.value
      ? { endpoint: `roles/${editing.value.uuid}`, method: 'PUT', body: JSON.stringify(body) }
      : { endpoint: 'roles', method: 'POST', body: JSON.stringify(body) }).http()
    if (response?.ok === false) return notification.notifyError(response.message)
    notification.notifySuccess(editing.value ? 'Rol actualizado: sus usuarios ya tienen los permisos nuevos' : 'Rol creado')
    dialog.value = false
    access.fetchRoles()
  } catch (error) {
    notification.notifyError(error?.message || 'Error al guardar el rol')
  } finally {
    saving.value = false
  }
}

// Borrado: solo roles propios y sin usuarios
const removeDialog = ref(false)
const toRemove = ref(null)
const askRemove = role => { toRemove.value = role; removeDialog.value = true }
const remove = async () => {
  try {
    const response = await new Request({ endpoint: `roles/${toRemove.value.uuid}`, method: 'DELETE' }).http()
    if (response?.ok === false) return notification.notifyError(response.message)
    notification.notifySuccess('Rol borrado')
    access.fetchRoles()
  } catch (error) {
    notification.notifyError(error?.message || 'Error al borrar el rol')
  } finally {
    removeDialog.value = false
  }
}
</script>

<template>
  <div class="roles">
    <header class="roles-head">
      <div>
        <span class="eyebrow">Administración</span>
        <h1>Roles y permisos</h1>
        <p>Los permisos de un rol los tienen por defecto todos sus usuarios. Los roles nuevos reservan salas como Usuario.</p>
      </div>
      <v-btn color="primary" variant="flat" prepend-icon="fa-solid fa-plus" class="kg-btn" @click="open()">Nuevo rol</v-btn>
    </header>

    <div class="role-grid">
      <article v-for="role in access.roles" :key="role.uuid" class="role-card">
        <div class="role-top">
          <div class="role-title">
            <strong>{{ role.name }}</strong>
            <span v-if="role.system" class="badge">Sistema</span>
          </div>
          <div class="role-actions">
            <button type="button" class="kg-icon-btn" aria-label="Editar rol" @click="open(role)"><i class="fa-solid fa-pen" /><v-tooltip activator="parent" location="top">Editar</v-tooltip></button>
            <button v-if="!role.system" type="button" class="kg-icon-btn danger" aria-label="Borrar rol" @click="askRemove(role)"><i class="fa-regular fa-trash-can" /><v-tooltip activator="parent" location="top">Borrar</v-tooltip></button>
          </div>
        </div>
        <p class="role-desc">{{ role.description || 'Sin descripción' }}</p>
        <div class="role-modules">
          <span v-for="title in modulesOf(role)" :key="title" class="module">{{ title }}</span>
          <span v-if="!modulesOf(role).length" class="muted">Sin permisos por defecto</span>
          <v-tooltip v-if="role.code !== ROLES.ADMIN && role.permissions.length" activator="parent" location="bottom">{{ detailOf(role).join(' · ') }}</v-tooltip>
        </div>
        <footer class="role-foot"><i class="fa-solid fa-users" /> {{ role.users }} {{ role.users === 1 ? 'usuario' : 'usuarios' }}</footer>
      </article>
    </div>
    <p v-if="!access.loading && !access.roles.length" class="muted">No hay roles.</p>

    <appDialog v-model="dialog" eyebrow="Roles y permisos" :title="editing ? `Editar ${editing.name}` : 'Nuevo rol'" :subtitle="editing?.system ? 'Rol de sistema: el nombre no se cambia.' : 'Los cambios de permisos se aplican al momento a todos sus usuarios.'" :closable="!saving" :width="680">
      <v-form id="role-form" ref="formRef" class="kg-form" @submit.prevent="save">
        <formField label="Nombre" column>
          <textField v-model="form.name" placeholder="Por ejemplo, Recepción" :disabled="editing?.system" :rules="[validate.required]" maxlength="60" />
        </formField>
        <formField label="Descripción" column>
          <textField v-model="form.description" placeholder="Para qué sirve este rol" maxlength="255" />
        </formField>
        <formField label="Permisos por defecto" column>
          <UserPermissions :key="editing?.uuid || 'new'" v-model="form.permissions" :catalog="access.catalog" :admin="isAdminRole" />
        </formField>
      </v-form>
      <template #actions>
        <v-btn variant="outlined" class="kg-btn kg-btn-ghost" :disabled="saving" @click="dialog = false">Cancelar</v-btn>
        <v-btn type="submit" form="role-form" color="primary" variant="flat" class="kg-btn" :loading="saving">{{ editing ? 'Guardar cambios' : 'Crear rol' }}</v-btn>
      </template>
    </appDialog>

    <appDialog v-model="removeDialog" :title="`¿Borrar el rol ${toRemove?.name}?`" icon="fa-regular fa-trash-can" tone="danger" :width="440">
      <p v-if="toRemove?.users" class="kg-note">Tiene {{ toRemove.users }} {{ toRemove.users === 1 ? 'usuario' : 'usuarios' }}: cámbiales el rol antes de borrarlo.</p>
      <p v-else class="kg-note">Se borran también sus permisos por defecto. No se puede deshacer.</p>
      <template #actions>
        <v-btn variant="outlined" class="kg-btn kg-btn-ghost" @click="removeDialog = false">Cancelar</v-btn>
        <v-btn color="#b91c1c" variant="flat" class="kg-btn" :disabled="!!toRemove?.users" @click="remove">Borrar</v-btn>
      </template>
    </appDialog>
  </div>
</template>

<style scoped>
.roles { max-width: 1200px; margin: 0 auto; padding: 32px 24px 48px; color: #111111 }

.roles-head { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 24px }
.eyebrow { display: block; margin-bottom: 4px; font-size: .72rem; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: #468131 }
.roles-head h1 { margin: 0; font-size: 1.6rem; font-weight: 600; letter-spacing: -0.01em }
.roles-head p { margin: 4px 0 0; font-size: .9rem; color: #64748b }

.role-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px }
.role-card { display: flex; flex-direction: column; gap: 10px; padding: 16px 18px; border: 1px solid #eceef2; border-radius: 14px; background: #ffffff }
.role-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px }
.role-title { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding-top: 6px }
.role-title strong { font-size: 1rem }
.badge { padding: 1px 8px; border-radius: 999px; background: #f1f2f4; color: #64748b; font-size: .7rem; font-weight: 600 }
.role-actions { display: flex; gap: 2px }
.role-desc { margin: 0; font-size: .85rem; color: #64748b }
.role-modules { display: flex; flex-wrap: wrap; gap: 4px; min-height: 24px }
.module { display: inline-flex; padding: 2px 8px; border: 1px solid #e5e7eb; border-radius: 6px; color: #334155; font-size: .75rem; font-weight: 500 }
.muted { color: #94a3b8; font-size: .85rem }
.role-foot { margin-top: auto; padding-top: 10px; border-top: 1px solid #f1f2f4; color: #64748b; font-size: .8rem; font-weight: 500 }
.role-foot i { margin-right: 4px }

@media (width < 760px) {
  .roles { padding: 20px 16px 32px }
  .roles-head h1 { font-size: 1.3rem }
  .roles-head .kg-btn { width: 100% }
  .role-grid { grid-template-columns: 1fr }
}
</style>
