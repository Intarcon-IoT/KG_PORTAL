import '@fortawesome/fontawesome-free/css/all.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'


// Import routes
import router from './router';

// Importa Vuetify
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { aliases, fa } from 'vuetify/iconsets/fa'

import './style/globals.css'

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'fa',
    aliases,
    sets: { fa },
  },
});

// Create Pinia store
const pinia = createPinia()
const app = createApp(App)

app.use(router);
app.use(pinia);
app.use(vuetify);
app.mount('#app');
