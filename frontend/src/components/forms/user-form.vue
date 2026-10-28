<!-- Alta y edición de usuarios desde Administración; los botones van fuera, enlazados por el id del formulario -->
<script setup>
import { computed, reactive, ref, watchEffect } from 'vue'
import { textField, formField } from '@/components/form-components'
import UserPermissions from './user-permissions.vue'
import { sessionStore, useAccessStore } from '@/store'
import validate from '@/utils/useValidationRules'
import { ROLES } from '@/utils/constants'
import { can } from '@/utils/permissions'
import { ROLE_LABELS } from '@/utils/labels'

const props = defineProps({
  id: { type: String, default: 'user-form' },
  mode: { type: String, validator: value => ['create', 'edit'].includes(value), required: true },
  value: { type: Object, default: () => ({}) },
  tenants: { type: Array, default: () => [] },
})

const emit = defineEmits(['saved'])

const session = sessionStore()
const access = useAccessStore()
// Sin ser Admin no se elige rol ni permisos, y la empresa solo con users.all_companies (igual que el backend)
const isAdmin = computed(() => session.auth.user?.role === ROLES.ADMIN)
const lockTenant = computed(() => !isAdmin.value && !can(session.auth.user, 'users.all_companies'))
const roles = computed(() => access.roles.length ? access.roles.map(r => ({ value: r.code, title: r.name })) : Object.values(ROLES).map(value => ({ value, title: ROLE_LABELS[value] })))
const selectedRole = computed(() => access.roleOf(form.role))

const formRef = ref(null)
const form = reactive({ name: '', mail: '', role: ROLES.USER, tenant_uuid: null, permissions: [] })

watchEffect(() => {
  form.permissions = [...(props.value?.permissions || [])]
  form.name = props.value?.name ?? ''
  form.mail = props.value?.mail ?? ''
  form.role = props.value?.role || ROLES.USER
  form.tenant_uuid = props.mode === 'create' && lockTenant.value ? session.auth.user?.tenant_uuid : props.value?.tenant_uuid ?? null
})

const submit = async () => {
  const { valid } = await formRef.value.validate()
  if (valid) emit('saved', { name: form.name, mail: form.mail, role: form.role, tenant_uuid: form.tenant_uuid }, form.permissions)
}
</script>

<template>
  <v-form :id="id" ref="formRef" class="kg-form" @submit.prevent="submit">
    <formField label="Nombre" column>
      <textField v-model="form.name" placeholder="Nombre y apellidos" autofocus :rules="[validate.required]" />
    </formField>
    <formField label="Correo electrónico" column>
      <textField v-model="form.mail" type="email" placeholder="nombre@empresa.com" :rules="[validate.required, validate.email]" />
    </formField>
    <div class="kg-row">
      <formField label="Rol" column>
        <v-select autocomplete="off" v-model="form.role" :items="roles" :rules="[validate.required]" :disabled="!isAdmin" />
      </formField>
      <formField label="Empresa" column>
        <v-select autocomplete="off" v-model="form.tenant_uuid" :items="tenants" item-title="name" item-value="uuid" placeholder="Selecciona una" :rules="[validate.required]" :disabled="lockTenant" />
      </formField>
    </div>
    <formField v-if="isAdmin" label="Módulos y permisos" column>
      <UserPermissions :key="value?.uuid || 'new'" v-model="form.permissions" :catalog="access.catalog" :admin="form.role === ROLES.ADMIN" :inherited="selectedRole?.permissions || []" :inherited-from="selectedRole ? `el rol ${selectedRole.name}` : ''" />
    </formField>
  </v-form>
</template>
