import { defineStore } from 'pinia';
import { createApp } from 'vue';
import appNotification from '@/components/app-notification.vue';
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { fa, aliases } from 'vuetify/iconsets/fa';

// Configuración de Vuetify para el componente de notificación
const customTheme = {
  dark: false,
  colors: {
    primary: '#658EB9',
    background: 'rgb(80, 79, 78)',
  },
};

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'fa',
    aliases,
    sets: {
      fa,
    },
  },
  theme: {
    defaultTheme: 'customTheme',
    themes: {
      customTheme,
    },
  },
});

// Crear y montar la instancia de notificación
const instance = createApp(appNotification);
const mountNode = document.createElement('div');
document.body.appendChild(mountNode);
instance.use(vuetify);
const mountedInstance = instance.mount(mountNode);

export const useNotificationStore = defineStore('notification', {
  actions: {
    notifySuccess(message) {
      mountedInstance.addNotification({
        message,
        type: 'success',
      });
    },
    notifyInfo(message) {
      mountedInstance.addNotification({
        message,
        type: 'info',
      });
    },
    notifyError(message, title = 'Error') {
      mountedInstance.addNotification({
        title,
        message,
        type: 'error',
      });
    },
    notifyWarning(message, title = 'Advertencia') {
      mountedInstance.addNotification({
        title,
        message,
        type: 'warning',
      });
    },
  },
});