<!-- Administración de usuarios: listado, alta, edición y baja -->
<script setup>
import { computed, onMounted, ref } from 'vue'
import appDialog from '@/components/app-dialog.vue'
import UserForm from '@/components/forms/user-form.vue'
import UserAdminList from '@/components/lists/user-admin-list.vue'
import { sessionStore, useAccessStore, useNotificationStore } from '@/store'
import { can } from '@/utils/permissions'
import Request from '@/model/request'
import { ROLES } from '@/utils/constants'

const notification = useNotificationStore()
const access = useAccessStore()

const usersList = ref([])
const tenantsList = ref([])
const loading = ref(false)
const saving = ref(false)
const dialog = ref(false)
const selectedUser = ref(null)

const isEditing = computed(() => !!selectedUser.value)
const canCreate = computed(() => can(sessionStore().auth.user, 'users.manage'))
// Solo el Admin ve los permisos en el formulario: el diálogo se ensancha para ellos
const isAdmin = computed(() => sessionStore().auth.user?.role === ROLES.ADMIN)
const activeUsers = computed(() => usersList.value.filter(u => u.active !== 0))
const admins = computed(() => activeUsers.value.filter(u => u.role === ROLES.ADMIN).length)

const loadUsers = async () => {
  loading.value = true
  try { usersList.value = (await new Request({ endpoint: 'users', method: 'GET' }).http()) || [] } catch { notification.notifyError('Error al cargar usuarios') } finally { loading.value = false }
}

const loadTenants = async () => {
  try { tenantsList.value = (await new Request({ endpoint: 'tenants', method: 'GET' }).http()) || [] } catch { notification.notifyError('Error al cargar las empresas') }
}

onMounted(() => { loadUsers(); loadTenants(); access.fetchRoles(); access.fetchCatalog() })

const openCreate = () => { selectedUser.value = null; dialog.value = true }
const openEdit = user => { selectedUser.value = user; dialog.value = true }

// El backend responde 200 con ok: false en algunos errores de validación
const send = async (request, okText, errorText) => {
  saving.value = true
  try {
    const response = await request.http()
    if (response?.ok === false) return notification.notifyError(response.message || errorText)
    notification.notifySuccess(okText)
    dialog.value = false
    loadUsers()
  } catch (error) {
    notification.notifyError(error?.message || errorText)
  } finally {
    saving.value = false
  }
}

// Datos y permisos van por separado: los permisos solo se envían si han cambiado
const save = async (payload, permissions) => {
  const editing = isEditing.value
  const errorText = editing ? 'Error al actualizar el usuario' : 'Error al crear el usuario'
  saving.value = true
  try {
    const response = await new Request(editing
      ? { endpoint: `users/${selectedUser.value.uuid}`, method: 'PUT', body: JSON.stringify(payload) }
      : { endpoint: 'users', method: 'POST', body: JSON.stringify(payload) }).http()
    if (response?.ok === false) return notification.notifyError(response.message || errorText)
    const uuid = editing ? selectedUser.value.uuid : response?.uuid
    const changed = [...permissions].sort().join() !== [...(selectedUser.value?.permissions || [])].sort().join()
    if (uuid && changed) await new Request({ endpoint: `users/${uuid}/permissions`, method: 'PUT', body: JSON.stringify({ permissions }) }).http()
    notification.notifySuccess(editing ? 'Usuario actualizado' : 'Usuario creado. Recibirá su contraseña por correo')
    dialog.value = false
    loadUsers()
  } catch (error) {
    notification.notifyError(error?.message || errorText)
  } finally {
    saving.value = false
  }
}

const setActive = (user, active) => send(
  new Request({ endpoint: `users/${user.uuid}/status`, method: 'PUT', body: JSON.stringify({ active }) }),
  active ? `${user.name} vuelve a tener acceso` : `${user.name} ya no puede acceder`,
  'Error al cambiar el estado del usuario'
)
</script>

<template>
  <div class="users">
    <header class="users-head">
      <div>
        <span class="eyebrow">Administración</span>
        <h1>Usuarios</h1>
        <p>Gestiona quién accede al portal y con qué permisos.</p>
      </div>
      <div class="head-side">
        <div class="stat"><span class="stat-value">{{ activeUsers.length }}</span><span class="stat-label">{{ activeUsers.length === 1 ? 'Usuario activo' : 'Usuarios activos' }}</span></div>
        <div class="stat"><span class="stat-value">{{ admins }}</span><span class="stat-label">{{ admins === 1 ? 'Administrador' : 'Administradores' }}</span></div>
        <v-btn v-if="canCreate" color="primary" variant="flat" prepend-icon="fa-solid fa-plus" class="kg-btn" @click="openCreate">Nuevo usuario</v-btn>
      </div>
    </header>

    <UserAdminList :users="usersList" :loading="loading" @edit="openEdit" @set-active="setActive" />

    <appDialog
      v-model="dialog" eyebrow="Administración" :title="isEditing ? 'Editar usuario' : 'Nuevo usuario'"
      :subtitle="isEditing ? selectedUser.mail : 'Le enviaremos por correo una contraseña para su primer acceso.'" :closable="!saving" :width="canCreate && isAdmin ? 680 : 520"
    >
      <UserForm id="user-form" :mode="isEditing ? 'edit' : 'create'" :value="selectedUser || {}" :tenants="tenantsList" @saved="save" />

      <template #actions>
        <v-btn variant="outlined" class="kg-btn kg-btn-ghost" :disabled="saving" @click="dialog = false">Cancelar</v-btn>
        <v-btn type="submit" form="user-form" color="primary" variant="flat" class="kg-btn" :loading="saving">{{ isEditing ? 'Guardar cambios' : 'Crear usuario' }}</v-btn>
      </template>
    </appDialog>
  </div>
</template>

<style scoped>
.users { max-width: 1200px; margin: 0 auto; padding: 32px 24px 48px; color: #111111 }

.users-head { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 24px }
.eyebrow { display: block; margin-bottom: 4px; font-size: .72rem; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: #468131 }
.users-head h1 { margin: 0; font-size: 1.6rem; font-weight: 600; letter-spacing: -0.01em }
.users-head p { margin: 4px 0 0; font-size: .9rem; color: #64748b }

.head-side { display: flex; align-items: center; flex-wrap: wrap; gap: 10px }
.stat { display: flex; align-items: baseline; gap: 8px; height: 40px; padding: 0 14px; border: 1px solid #eceef2; border-radius: 10px; background: #ffffff; line-height: 40px }
.stat-value { font-size: 1.15rem; font-weight: 700 }
.stat-label { font-size: .8rem; font-weight: 500; color: #64748b }

@media (width < 760px) {
  .users { padding: 20px 16px 32px }
  .users-head h1 { font-size: 1.3rem }
  .head-side { display: grid; grid-template-columns: 1fr 1fr; width: 100% }
  .head-side .kg-btn { grid-column: 1 / -1 }
}
</style>
