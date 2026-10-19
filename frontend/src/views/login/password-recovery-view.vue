<template>
  <main class="main-login">
    <div class="header-container">
      <appLogo/>
      <p>Introduzca su correo electrónico para recuperar su contraseña</p>
    </div>
    <v-form ref="formRef" @submit.prevent="handlerSubmit">
      <div class="form">
        <formField column>
          <textField placeholder="correo" v-model="email" :rules="[validate.required, validate.email]" />
        </formField>
        <v-btn 
          color="primary" 
          prepend-icon="fa-solid fa-right-to-bracket" 
          type="submit" 
          class="btn-submit"
        >
          <div class="loading-btn">
            Enviar correo de recuperación
          </div>
        </v-btn>
      </div>
    </v-form>
  </main>
</template>

<script>
import { appLogo } from '@/components';
import { textField, formField } from '@/components/form-components';
import { ref } from 'vue';
import { sessionStore } from '@/store';
import { useNotificationStore } from '@/store';
import Request from "@/model/request";
import router from '@/router';
import validate from '@/utils/useValidationRules'


export default {
  name: 'LoginView',
  components: {
    appLogo,
    textField,
    formField,
  },
  setup() {
    const notificationStore = useNotificationStore();
    const session = sessionStore();

    let show_password = ref(false);
    const email = ref('');
    const formRef = ref(null);  

    const handlerSubmit = async () => {
    const { valid } = await formRef.value.validate();

      if (!valid) {
        return notificationStore.notifyError('Por favor, introduce un correo válido');
      }

      try {
        const request = new Request({
          endpoint: 'password-reset/request-password-reset',
          method: 'POST',
          body: JSON.stringify({ email: email.value })
        });
        await request.http();

        notificationStore.notifySuccess('Se ha enviado un correo de recuperación');
        router.push('/login');

      } catch (error) {
        return notificationStore.notifyError('Error al enviar el correo de recuperación');
      }
    }

    return {
      handlerSubmit,
      show_password,
      email,
      formRef,
      validate
    }
  }
}
</script>

<style lang="css" scoped>

.main-login {
  width: 40vw;
  height: fit-content;
  margin: auto;
  background-color: var(--white-transparent-xs);
  margin-top: 25vh;
  border-radius: 7.5px;
  box-shadow: rgba(0, 0, 0, 0.16) 0px 1px 4px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 6px;
}

.header-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  text-align: center;
  margin-bottom: 2rem;
}

.form {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
  padding: 25px;
  height: 100%;
}

.btn-submit {
  margin-top: 1rem;
}

@media (width < 1600px) {
  .main-login {
    width: 50vw;
  }
}

@media (width < 1200px) {
  .main-login {
    width: 60vw;
  }
}

@media (width < 900px) {
  .main-login {
    width: 85vw;
  }
}

@media (width < 600px) {
  .main-login {
    width: 90vw;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
    height: auto;
    margin-top: 1vh;
  }
}

.loading-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: .5rem;
  color: var(--white-color);
  border-radius: 50px;
  width: 100%;
}
</style>
