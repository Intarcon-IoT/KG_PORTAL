<!-- Tabla de usuarios con búsqueda y filtros; los usuarios nunca se borran, se deshabilitan -->
<script setup>
import { computed, ref, watch } from 'vue'
import { sessionStore } from '@/store'
import appDialog from '@/components/app-dialog.vue'
import TablePagination from '@/components/table-pagination.vue'
import { ROLES } from '@/utils/constants'
import { ROLE_LABELS, initialsOf } from '@/utils/labels'

const props = defineProps({ users: { type: Array, required: true, default: () => [] }, loading: { type: Boolean, default: false } })
const emit = defineEmits(['edit', 'set-active'])

const session = sessionStore()
const search = ref('')
const filter = ref('all')
const page = ref(1)
const itemsPerPage = ref(25)

const isActive = user => user.active !== 0
const filters = [
  { value: 'all', title: 'Todos', test: () => true },
  { value: ROLES.ADMIN, title: 'Administradores', test: u => u.role === ROLES.ADMIN },
  { value: ROLES.GESTOR, title: 'Gestores', test: u => u.role === ROLES.GESTOR },
  { value: ROLES.USER, title: 'Usuarios', test: u => u.role === ROLES.USER },
  { value: 'disabled', title: 'Deshabilitados', test: u => !isActive(u) },
]
const countOf = f => props.users.filter(f.test).length

// Búsqueda propia: el correo no es columna y v-data-table solo busca en columnas
const normalize = text => (text || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
const items = computed(() => {
  const q = normalize(search.value)
  const test = filters.find(f => f.value === filter.value).test
  return props.users.filter(u => test(u) && (!q || [u.name, u.mail, u.tenant_name].some(v => normalize(v).includes(q))))
})

watch([search, filter], () => { page.value = 1 })

const headers = [
  { title: 'Usuario', key: 'name', sortable: true },
  { title: 'Rol', key: 'role', sortable: true, width: 160 },
  { title: 'Empresa', key: 'tenant_name', sortable: true, width: 200 },
  { title: 'Estado', key: 'active', sortable: true, width: 140 },
  { title: '', key: 'actions', sortable: false, align: 'end', width: 110 },
]

// Nadie se modifica a sí mismo aquí; un gestor no toca a gestores ni administradores
const canModify = target => {
  const me = session.auth.user
  if (!me || target.uuid === me.uuid) return false
  return !(me.role === ROLES.GESTOR && [ROLES.GESTOR, ROLES.ADMIN].includes(target.role))
}

// Deshabilitar pide confirmación; volver a habilitar es inmediato
const disableDialog = ref(false)
const userToDisable = ref(null)

const toggleActive = user => {
  if (!isActive(user)) return emit('set-active', user, true)
  userToDisable.value = user
  disableDialog.value = true
}

const confirmDisable = () => {
  emit('set-active', userToDisable.value, false)
  disableDialog.value = false
}
</script>

<template>
  <div class="ulist">
    <div class="toolbar">
      <v-text-field autocomplete="off" v-model="search" placeholder="Buscar por nombre, correo o empresa" prepend-inner-icon="fa-solid fa-magnifying-glass" variant="outlined" density="compact" hide-details clearable class="search" />
      <div class="segmented" role="tablist">
        <button v-for="f in filters" :key="f.value" type="button" role="tab" :aria-selected="filter === f.value" :class="{ active: filter === f.value }" @click="filter = f.value">
          {{ f.title }} <span>{{ countOf(f) }}</span>
        </button>
      </div>
    </div>

    <div class="table-card">
      <v-data-table
        v-model:page="page"
        v-model:items-per-page="itemsPerPage"
        :headers="headers"
        :items="items"
        :loading="loading"
        :row-props="({ item }) => ({ class: isActive(item) ? '' : 'row-disabled' })"
        density="comfortable"
        class="table"
        hover
      >
        <template #item.name="{ item }">
          <div class="who">
            <span class="avatar">{{ initialsOf(item.name || item.mail) }}</span>
            <span class="who-text">
              <strong>{{ item.name }}</strong>
              <small>{{ item.mail }}</small>
            </span>
          </div>
        </template>

        <template #item.role="{ item }">
          <span class="role" :class="`role-${item.role?.toLowerCase()}`">{{ ROLE_LABELS[item.role] || item.role }}</span>
        </template>

        <template #item.tenant_name="{ item }">
          <span v-if="item.tenant_name" class="tenant">{{ item.tenant_name }}</span>
          <span v-else class="muted">Sin empresa</span>
        </template>

        <template #item.active="{ item }">
          <span class="status" :class="{ off: !isActive(item) }">{{ isActive(item) ? 'Activo' : 'Deshabilitado' }}</span>
        </template>

        <template #item.actions="{ item }">
          <div class="actions">
            <button type="button" class="icon-btn" :disabled="!canModify(item)" aria-label="Editar usuario" @click="emit('edit', item)">
              <i class="fa-solid fa-pen" />
              <v-tooltip activator="parent" location="top">Editar</v-tooltip>
            </button>
            <button type="button" class="icon-btn" :class="isActive(item) ? 'icon-danger' : 'icon-ok'" :disabled="!canModify(item)" :aria-label="isActive(item) ? 'Deshabilitar usuario' : 'Habilitar usuario'" @click="toggleActive(item)">
              <i :class="isActive(item) ? 'fa-solid fa-user-slash' : 'fa-solid fa-user-check'" />
              <v-tooltip activator="parent" location="top">{{ isActive(item) ? 'Deshabilitar' : 'Habilitar' }}</v-tooltip>
            </button>
          </div>
        </template>

        <template #no-data>
          <div class="empty">
            <i class="fa-solid fa-users-slash" />
            <span v-if="loading">Cargando usuarios…</span>
            <span v-else-if="search">Nadie coincide con «{{ search }}»</span>
            <span v-else>No hay usuarios</span>
          </div>
        </template>

        <template #bottom>
          <TablePagination v-if="items.length" v-model:page="page" v-model:items-per-page="itemsPerPage" :total="items.length" />
        </template>
      </v-data-table>
    </div>

    <appDialog v-model="disableDialog" :title="`¿Deshabilitar a ${userToDisable?.name}?`" icon="fa-solid fa-user-slash" tone="danger" :width="440">
      <p class="kg-note">No podrá iniciar sesión y se cerrarán sus sesiones abiertas. Sus reservas se conservan y puedes volver a habilitarlo cuando quieras.</p>
      <template #actions>
        <v-btn variant="outlined" class="kg-btn kg-btn-ghost" @click="disableDialog = false">Cancelar</v-btn>
        <v-btn color="#b91c1c" variant="flat" class="kg-btn" @click="confirmDisable">Deshabilitar</v-btn>
      </template>
    </appDialog>
  </div>
</template>

<style scoped>
/* Barra de búsqueda y filtro */
.toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 14px }
.search { flex: 1 1 280px; max-width: 420px }
.search :deep(.v-field) { border-radius: 10px; background: #ffffff; font-size: .875rem }
.search :deep(.v-field__outline) { --v-field-border-opacity: 1; color: #e5e7eb }
.search :deep(.v-field--focused .v-field__outline) { color: #111111 }
.search :deep(.v-field__prepend-inner .v-icon) { font-size: .8rem; color: #94a3b8 }

.segmented { display: flex; gap: 2px; padding: 3px; border: 1px solid #e5e7eb; border-radius: 10px; background: #ffffff; overflow-x: auto }
.segmented button { display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: 0; border-radius: 7px; background: transparent; color: #64748b; font: inherit; font-size: .825rem; font-weight: 600; white-space: nowrap; cursor: pointer }
.segmented button span { padding: 0 6px; border-radius: 999px; background: #f1f2f4; color: #64748b; font-size: .7rem }
.segmented button:hover { color: #111111 }
.segmented button.active { background: #111111; color: #ffffff }
.segmented button.active span { background: rgba(255, 255, 255, .18); color: #ffffff }

/* Tabla */
.table-card { overflow: hidden; border: 1px solid #eceef2; border-radius: 14px; background: #ffffff }
.table { background: transparent; font-size: .875rem }
.table :deep(thead th) { height: 44px !important; background: #fbfbfc; font-size: .72rem; font-weight: 600 !important; letter-spacing: .1em; text-transform: uppercase; color: #94a3b8 !important }
.table :deep(tbody td) { height: 64px !important; border-bottom-color: #f1f2f4 !important }
.table :deep(.row-disabled .who), .table :deep(.row-disabled .role), .table :deep(.row-disabled .tenant) { opacity: .5 }

.who { display: flex; align-items: center; gap: 12px; min-width: 0 }
.avatar { display: grid; place-items: center; flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%; background: #eef4ea; color: #33662d; font-size: .75rem; font-weight: 700 }
.who-text { display: flex; flex-direction: column; min-width: 0 }
.who-text strong { overflow: hidden; font-weight: 600; text-overflow: ellipsis; white-space: nowrap }
.who-text small { overflow: hidden; font-size: .8rem; color: #64748b; text-overflow: ellipsis; white-space: nowrap }

.role { display: inline-flex; padding: 3px 10px; border-radius: 999px; background: #f1f2f4; color: #334155; font-size: .75rem; font-weight: 600 }
.role-admin { background: #111111; color: #ffffff }
.role-gestor { background: #eef4ea; color: #33662d }
.tenant { color: #334155 }
.muted { color: #94a3b8 }

.status { display: inline-flex; align-items: center; gap: 6px; font-size: .8rem; font-weight: 600; color: #33662d }
.status::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: #5bb133 }
.status.off { color: #94a3b8 }
.status.off::before { background: #cbd5e1 }

.actions { display: flex; justify-content: flex-end; gap: 4px }
.icon-btn { display: grid; place-items: center; width: 34px; height: 34px; border: 0; border-radius: 9px; background: transparent; color: #64748b; font-size: .85rem; cursor: pointer; transition: background-color .15s, color .15s }
.icon-btn:hover:not(:disabled) { background: #f1f2f4; color: #111111 }
.icon-danger:hover:not(:disabled) { background: #fef2f2; color: #b91c1c }
.icon-ok:hover:not(:disabled) { background: #f1f5ee; color: #33662d }
.icon-btn:disabled { opacity: .3; cursor: not-allowed }

.empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 48px 16px; color: #94a3b8 }
.empty i { font-size: 1.5rem }

@media (width < 760px) {
  .search { max-width: none }
  .segmented { width: 100% }
}
</style>
