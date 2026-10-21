import '@fortawesome/fontawesome-free/css/all.css'
import '@fontsource-variable/manrope'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { es } from 'vuetify/locale'


// Import routes
import router from './router';

// Importa Vuetify
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { aliases, fa } from 'vuetify/iconsets/fa'

import { sessionStore, useNotificationStore } from '@/store';

import './style/globals.css'
import './style/forms.css'

const vuetify = createVuetify({
  components,
  directives,
  // Vuetify 4 sigue por defecto el tema del sistema; la app solo está diseñada en claro. Colores del diseño del portal
  theme: {
    defaultTheme: 'light',
    themes: { light: { colors: { primary: '#111111', secondary: '#468131', success: '#16a34a', error: '#dc2626', warning: '#d97706', info: '#2563eb' } } },
  },
  // Campos con el mismo aspecto en toda la app (bordeados y compactos); el estilo fino está en style/forms.css
  defaults: {
    VTextField: { variant: 'outlined', density: 'comfortable' },
    VTextarea: { variant: 'outlined', density: 'comfortable' },
    VSelect: { variant: 'outlined', density: 'comfortable', menuIcon: 'fa-solid fa-chevron-down', menuProps: { offset: 6 } },
    VAutocomplete: { variant: 'outlined', density: 'comfortable', menuIcon: 'fa-solid fa-chevron-down', menuProps: { offset: 6 } },
  },
  icons: {
    defaultSet: 'fa',
    aliases,
    sets: { fa },
  },
  locale: {
    locale: 'es',
    messages: { es },
  },
});

// Restaura la sesión guardada: solo se descarta si el servidor la rechaza (401/403). Ante un fallo de red
// o del servidor reintenta y, si persiste, la conserva en localStorage para la siguiente recarga
const restoreSession = async (session, notificationStore) => {
  for (const wait of [0, 1500, 3000]) {
    if (wait) await new Promise(resolve => setTimeout(resolve, wait))
    try {
      return await session.auth.loadAuth()
    } catch (err) {
      if (![401, 403].includes(err?.code)) continue
      session.auth.resetCredentials()
      localStorage.removeItem('session')
      return router.push({ name: 'Log In' })
    }
  }
  session.auth.resetCredentials()
  notificationStore.notifyError('No se ha podido conectar con el servidor. Recarga la página en unos momentos')
  router.push({ name: 'Log In' })
}

const initializeApp = async () => {

  const pinia = createPinia()
  const app = createApp(App)

  app.use(pinia);

  await restoreSession(sessionStore(), useNotificationStore())

  app.use(router);
  app.use(vuetify);
  app.mount('#app');
};

initializeApp().catch(err => {
  console.error('Error during app initialization:', err);
});
