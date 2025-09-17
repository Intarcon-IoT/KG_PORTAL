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
      <v-col cols="12" md="4" v-if="context==='admin'">
        <v-switch
          v-model="form.isAdmin"
          label="Administrador"
          color="primary"
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
import { reactive, ref, watchEffect } from 'vue'
import validate from '@/utils/useValidationRules'

const props = defineProps({
  mode: {
    type: String,
    validator: value => ['create', 'edit'].includes(value),
    required: true
  },
  context: {
    type: String,
    validator: value => ['admin', 'self'].includes(value),
    required: true
  },
  value: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['saved', 'cancel'])

const valid = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const showCurrentPassword = ref(false)

const form = reactive({
  name: '',
  mail: '',
  isAdmin: false,
  password: '',
  confirmPassword: '',
  currentPassword: ''
})

watchEffect(() => {
  form.name = props.value?.name ?? ''
  form.mail = props.value?.mail ?? ''
  form.isAdmin = props.context === 'admin' ? !!props.value?.isAdmin : false
  form.password = ''
  form.confirmPassword = ''
  form.currentPassword = ''
})

function buildFormData() {
  if (props.context === 'admin') {
    return {
      name: form.name,
      mail: form.mail,
      isAdmin: form.isAdmin,
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
