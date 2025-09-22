<template>
  <main class="main-login">

    <div class="header">
      <div class="logo-parent">
        <kiLogo style="margin-inline: auto" :size="8.7" />
        <span class="txt-header">Gestión de reservas</span>
      </div>

      <div class="footer">
        <span class="title-footer">Autorización requerida</span>
        <span class="txt-footer">Introduzca su correo electrónico y contraseña</span>
      </div>
    </div>

    <v-form v-model="valid" @submit.prevent="(v) => handlerSubmit(v)">
      <div class="form">
        <kiInput label="Correo" column>
          <kiTextField 
            placeholder="correo" 
            v-model="credentials.email" 
            :rules="[validate.required, validate.email]"
          />
        </kiInput>

        <kiInput label="Contraseña" column>
          <kiTextField 
            placeholder="contraseña"
            v-model="credentials.password" 
            :type="show_password ? 'text' : 'password'"      
            :append-inner-icon="show_password ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'"
            :rules="[validate.required]"       
            @click:append-inner="show_password = !show_password" />
        </kiInput>

        <v-btn color="primary" prepend-icon="fa-solid fa-right-to-bracket" type="submit" class="btn-submit">
          <div class="loading-btn">
            Iniciar sesión
          </div>
        </v-btn>
        <div class="forgot-password-container">
          <a class="forgot-password-link" @click.prevent="handlerForgotPassword()">¿Olvidaste tu contraseña?</a>
        </div>
      </div>
    </v-form>
  </main>
</template>

<script>
import { kiLogo } from '@/components';
import { kiTextField, kiInput } from '@/components/ki-form-components';
import { ref } from 'vue';
import { sessionStore } from '@/store';
import router from '@/router';
import { useNotificationStore } from '@/store';
import validate from '@/utils/useValidationRules'

export default {
  name: 'LoginView',
  components: {
    kiLogo,
    kiTextField,
    kiInput,
  },
  setup() {
    const notificationStore = useNotificationStore();
    const session = sessionStore();

    const valid = ref(false);
    const reload = ref(false);
    const show_password = ref(false);

    const credentials = ref({
      email: '',
      password: ''
    });

    const handlerSubmit = async (data) => {   
      const ok = valid.value
      if (!ok){
        return
      }

      const credentials = {
        email: data.target[0].value,
        password: data.target[1].value
      }

      reload.value = true;

      session.auth.login({
        ...credentials,
        role: 'admin'
      }).then(res => {
        session.setSession({
          session: true,
          token: res.user.token,
          email: credentials.email,
          role: res.role,
          user: res.user
        })
        notificationStore.notifySuccess('Se ha iniciado sesión correctamente');
        router.push('/calendar')
      })
        .catch(err =>
          notificationStore.notifyError('Credenciales no válidas')
        )
        .finally(() => reload.value = false)
    }

    const handlerForgotPassword = () => {
      router.push('/forgot-password');
    }

    return {
      credentials,
      handlerSubmit,
      show_password,
      reload,
      handlerForgotPassword,
      valid,
      validate,
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
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 6px;
}

.header {
  border: 1px solid var(--white-transparent-xs);
  border-radius: 4px;
  display: grid;
  grid-template-rows: 1fr .34fr;
}

.logo-parent {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 10px;
}

.ki-logo {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  margin-top: 10px;
}

.ki-logo img {
  margin-right: -.6rem;
}

.txt-header {
  font-size: 1.5rem;
  margin-top: 1rem;
}

.footer {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  gap: .5rem;
  padding-inline: 1rem;
}

.title-footer {
  font-size: 1.25rem;
  font-weight: bold;
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

  .ki-logo {
    margin-top: -2rem;
  }

  .header {
    padding: 1rem;
    gap: 2.5rem;
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

.forgot-password-container {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}

.forgot-password-link {
  color: var(--primary-color);
  text-decoration: underline;
  cursor: pointer;
}
</style>
