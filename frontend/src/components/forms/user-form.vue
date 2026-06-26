<template>
  <v-form v-model="valid" @submit.prevent="onSubmit">
    <v-row dense>
      <!-- Name -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model="form.name"
          label="Nombre"
          :rules="[validate.required]"
          clearable
        />
      </v-col>
      <!-- Email -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model="form.mail"
          label="Email"
          :rules="[validate.required, validate.email]"
          type="email"
          clearable
        />
      </v-col>
    </v-row>

    <v-row dense>
      <!-- Is Admin (solo visible en contexto admin) -->
      <v-col cols="12" md="6" v-if="context=== ROLES.ADMIN">
        <v-select
          v-model="form.role"
          :items="Object.values(ROLES)"
          label="Rol"
          color="primary"
          :rules="[validate.required]"
          :disabled="isGestor"
        />
      </v-col>
      <v-col cols="12" md="6" v-if="context=== ROLES.ADMIN">
        <v-select
          v-model="form.tenant_uuid"
          :items="tenants"
          item-title="name"
          item-value="uuid"
          label="Grupo / Tenant"
          color="primary"
          clearable
          :disabled="isGestor"
        />
      </v-col>
    </v-row>   
      <!-- Sección de contraseñas -->
      <template v-if="context==='self'">
        <v-row dense>
          <v-divider class="my-4" />
        </v-row>
        <v-row dense>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.currentPassword"
              label="Contraseña actual"
              :type="showCurrentPassword ? 'text' : 'password'"
              :rules="[form.password ? validate.required : () => true]"
              :append-inner-icon="showCurrentPassword ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'"
              @click:append-inner="showCurrentPassword = !showCurrentPassword"
            />
          </v-col>
        </v-row>

        <v-row dense>
          <!-- Nueva contraseña -->
          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.password"
              label="Nueva contraseña"
              :type="showPassword ? 'text' : 'password'"
              :rules="[validate.password]"
              :append-inner-icon="showPassword ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'"
              @click:append-inner="showPassword = !showPassword"
            />
          </v-col>
          <!-- Confirmar contraseña -->
          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.confirmPassword"
              label="Confirmar contraseña"
              :type="showConfirmPassword ? 'text' : 'password'"
              :rules="validate.confirmPassword(form.password)"
              :append-inner-icon="showConfirmPassword ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'"
              @click:append-inner="showConfirmPassword = !showConfirmPassword"
            />
          </v-col>
        </v-row>

        <v-row dense>
          <v-col cols="12">
            <div class="text-caption text-grey">
              Solo rellene estos campos si desea cambiar su contraseña actual.
            </div>
          </v-col>
        </v-row>
      </template>
    <v-divider class="my-4" />
    <v-btn type="submit" color="primary">Guardar</v-btn>
    <v-btn variant="text" @click="$emit('cancel')">Cancelar</v-btn>
  </v-form>
</template>

<script setup>
import { reactive, ref, watchEffect, computed } from 'vue'
import validate from '@/utils/useValidationRules'
import { ROLES } from '@/utils/constants'
import { sessionStore } from '@/store'

const props = defineProps({
  mode: {
    type: String,
    validator: value => ['create', 'edit'].includes(value),
    required: true
  },
  context: {
    type: String,
    validator: value => [ROLES.ADMIN, 'self'].includes(value),
    required: true
  },
  value: {
    type: Object,
    default: () => ({})
  },
  tenants: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['saved', 'cancel'])

const session = sessionStore()
const isGestor = computed(() => session.auth.user?.role === ROLES.GESTOR)

const valid = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const showCurrentPassword = ref(false)

const form = reactive({
  name: '',
  mail: '',
  role: ROLES.USER,
  tenant_uuid: null,
  password: '',
  confirmPassword: '',
  currentPassword: ''
})

watchEffect(() => {
  form.name = props.value?.name ?? ''
  form.mail = props.value?.mail ?? ''
  form.role = props.context === ROLES.ADMIN ? (props.value?.role || ROLES.USER) : ROLES.USER
  
  if (props.mode === 'create' && isGestor.value) {
    form.tenant_uuid = session.auth.user?.tenant_uuid
  } else {
    form.tenant_uuid = props.value?.tenant_uuid ?? null
  }
  form.password = ''
  form.confirmPassword = ''
  form.currentPassword = ''
})

function buildFormData() {
  if (props.context === ROLES.ADMIN) {
    return {
      name: form.name,
      mail: form.mail,
      role: form.role,
      tenant_uuid: form.tenant_uuid
    }
  } else {
    const formData = {
      name: form.name,
      mail: form.mail,
    }
    
    if (form.password && form.password === form.confirmPassword) {
      formData.password = form.password
      formData.currentPassword = form.currentPassword
    }

    return formData
  }
}

async function onSubmit() {
  if (form.password && form.password !== form.confirmPassword) {
    return
  }
  const ok = valid.value
  if (!ok){
    return
  }
  const formData = buildFormData()
  emit('saved', formData)
}

</script>
