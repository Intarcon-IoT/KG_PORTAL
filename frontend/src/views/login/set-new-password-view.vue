<template>
  <main class="main-login">
    <div class="header-container">
      <appLogo/>
      <p>Establezca su nueva contraseña</p>
    </div>
    <v-form v-model="valid" @submit.prevent="handlerSubmit">
      <div class="form">
        <formField column>
          <textField 
            placeholder="Nueva contraseña" 
            :type="show_password_1 ? 'text' : 'password'"
            v-model="password_1"
            :rules="[validate.required, validate.password]"
            :append-inner-icon="show_password_1 ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'"
            @click:append-inner="show_password_1 = !show_password_1" />
          <textField 
            placeholder="Confirme la nueva contraseña" 
            :type="show_password_2 ? 'text' : 'password'" 
            v-model="password_2"
            :rules="validate.confirmPassword(password_1)"
            :append-inner-icon="show_password_2 ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'"
            @click:append-inner="show_password_2 = !show_password_2" />
        </formField>
        <v-btn color="primary" prepend-icon="fa-solid fa-right-to-bracket" type="submit" class="btn-submit">
          <div class="loading-btn">
            <span>Actualizar contraseña</span>
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
import { useNotificationStore } from '@/store';
import { sessionStore } from '@/store';
import { useRoute } from 'vue-router';
import Request from "@/model/request";
import router from '@/router';
import validate from '../../utils/useValidationRules';

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
    const route = useRoute();
    const token = route.query.token;

    const valid = ref(false);
    const show_password_1 = ref(false);
    const show_password_2 = ref(false);
    const password_1 = ref('');
    const password_2 = ref('');

    const handlerSubmit = async() => {
      const ok = valid.value
      if (!ok){
        return
      }
      if (password_1.value !== password_2.value) {
        return;
      }

      try {
        session.auth.token = token;

        const request = new Request({
          endpoint: 'password-reset/reset-password',
          method: 'PUT',
          body: JSON.stringify({ newPassword: password_1.value })
        });
        await request.http();

        session.auth.token = '';

        notificationStore.notifySuccess('Contraseña actualizada con éxito');
        router.push('/login');
        
      } catch (error) {
        notificationStore.notifyError('Error al actualizar la contraseña');
      }
    }

    return {
      valid,
      validate,
      handlerSubmit,
      show_password_1,
      show_password_2,
      password_1,
      password_2,
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

.form {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
  padding: 25px;
  height: 100%;
}

.header-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  text-align: center;
  margin-bottom: 2rem;
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
