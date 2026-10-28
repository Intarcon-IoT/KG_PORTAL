import { createRouter, createWebHistory } from 'vue-router'
import { layout } from '@/components'
import { sessionGuard, resetPasswordGuard, adminGuard, permissionGuard } from './guard'
import { ROLES } from '@/utils/constants';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      name: 'Home',
      path: '',
      component: layout,
      redirect: '/calendar',
      meta: { show: false },
      beforeEnter: sessionGuard,
      children: [
        // meta.section agrupa el menú lateral; meta.title es el texto que se muestra
        {
          path: 'calendar',
          name: 'Calendario',
          meta: { icon: 'fa-regular fa-calendar', title: 'Calendario', section: 'Reservas de salas' },
          component: () => import('../views/CalendarView.vue'),
        },
        {
          path: 'bookings-validation',
          name: 'Validar Reservas',
          meta: { permission: 'bookings.validate', icon: 'fa-regular fa-circle-check', title: 'Validar reservas', section: 'Reservas de salas', badge: 'pending' },
          component: () => import('../views/bookings/booking-validation-view.vue'),
          beforeEnter: permissionGuard,
        },
        {
          path: 'reception/visits',
          name: 'Visitas',
          meta: { permission: 'visits.view', icon: 'fa-solid fa-id-card-clip', title: 'Visitas', section: 'Recepción' },
          component: () => import('../views/reception/visits-view.vue'),
          beforeEnter: permissionGuard,
        },
        {
          path: 'users',
          name: 'Administrar Usuarios',
          meta: { permission: 'users.view', icon: 'fa-solid fa-users', title: 'Usuarios', section: 'Administración' },
          component: () => import('../views/users/user-admin-view.vue'),
          beforeEnter: permissionGuard,
        },
        {
          path: 'roles',
          name: 'Administrar Roles',
          meta: { role: [ROLES.ADMIN], icon: 'fa-solid fa-user-shield', title: 'Roles y permisos', section: 'Administración' },
          component: () => import('../views/users/role-admin-view.vue'),
          beforeEnter: adminGuard,
        },
        {
          path: 'my-account',
          name: 'Mi Cuenta',
          meta: { show: false, icon: 'fa fa-user' },
          component: () => import('../views/users/my-account-view.vue'),
        }
      ]
    },
    {
      path: '/login',
      name: 'Log In',
      meta: { show: false },
      component: () => import('@/views/login/login-view.vue')
    },
    {
      path: '/forgot-password',
      name: 'Forgot Password',
      meta: { show: false },
      component: () => import('@/views/login/password-recovery-view.vue')
    },
    {
      path: '/reset-password',
      name: 'Reset Password',
      meta: { show: false },
      component: () => import('@/views/login/set-new-password-view.vue'),
      beforeEnter: resetPasswordGuard
    }
  ]
})

// Si una vista no carga (chunk desfasado tras un despliegue), recarga una sola vez en el destino; si vuelve a fallar en 30 s, no insiste
const isChunkError = error => /dynamically imported module|Importing a module script failed|error loading dynamically/i.test(error?.message || '')
router.onError((error, to) => {
  if (!isChunkError(error)) return
  const last = Number(sessionStorage.getItem('chunk-reload') || 0)
  if (Date.now() - last < 30000) return
  sessionStorage.setItem('chunk-reload', String(Date.now()))
  window.location.assign(to.fullPath)
})

export default router;
