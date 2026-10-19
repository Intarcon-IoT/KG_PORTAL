import '@fortawesome/fontawesome-free/css/all.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
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

const vuetify = createVuetify({
  components,
  directives,
  // Vuetify 4 sigue por defecto el tema del sistema; la app solo está diseñada en claro
  theme: { defaultTheme: 'light' },
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

const initializeApp = async () => {

  const pinia = createPinia()
  const app = createApp(App)

  app.use(pinia);

  const session = sessionStore();
  const notificationStore = useNotificationStore();

  try {
    await session.auth.loadAuth();
  } catch(err) {
    session.auth.logout();
    notificationStore.notifyError(err.message);
    router.push({ name:'Log In'});
  }

  app.use(router);
  app.use(vuetify);
  app.mount('#app');
};

initializeApp().catch(err => {
  console.error('Error during app initialization:', err);
});
