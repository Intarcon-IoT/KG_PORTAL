import { defineStore } from 'pinia'
import Request from '@/model/request'
import { useNotificationStore } from './useNotificationStore'

// Roles y catálogo de permisos para Administración (Usuarios y Roles)
export const useAccessStore = defineStore('access', {
  state: () => ({ roles: [], catalog: [], loading: false }),
  getters: {
    // Permisos sueltos con su módulo, para filtros y etiquetas
    actions: state => state.catalog.flatMap(m => m.actions.map(a => ({ ...a, module: m.title }))),
    roleOf: state => code => state.roles.find(r => r.code === code),
  },
  actions: {
    async fetchRoles() {
      this.loading = true
      try { this.roles = (await new Request({ endpoint: 'roles', method: 'GET' }).http()) || [] } catch { useNotificationStore().notifyError('Error al cargar los roles') } finally { this.loading = false }
    },
    async fetchCatalog() {
      if (this.catalog.length) return
      try { this.catalog = (await new Request({ endpoint: 'users/permissions', method: 'GET' }).http()) || [] } catch { useNotificationStore().notifyError('Error al cargar los módulos') }
    },
  },
})
