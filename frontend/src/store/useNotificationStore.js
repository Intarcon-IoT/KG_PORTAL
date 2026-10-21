import { defineStore } from 'pinia'
import { createApp } from 'vue'
import appNotification from '@/components/app-notification.vue'

// Los avisos viven en su propia instancia montada en <body> para poder lanzarlos desde cualquier sitio
const mountNode = document.createElement('div')
document.body.appendChild(mountNode)
const notifier = createApp(appNotification).mount(mountNode)

export const useNotificationStore = defineStore('notification', {
  actions: {
    notifySuccess(message, title = '') { notifier.addNotification({ title, message, type: 'success' }) },
    notifyError(message, title = 'Error') { notifier.addNotification({ title, message, type: 'error' }) },
    notifyWarning(message, title = 'Atención') { notifier.addNotification({ title, message, type: 'warning' }) },
  },
})
