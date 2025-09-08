import { createRouter, createWebHistory } from 'vue-router'
import { layout } from '@/components'
import { sessionGuard, resetPasswordGuard } from './guard'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      name: 'Home',
      path: '',
      component: layout,
      redirect: '/calendar',
      meta: { show: false },
      beforeEnter: (to, from, next) => sessionGuard(next),
      children: [
        {
          path: 'calendar',
          name: 'Calendario',
          meta: { icon: 'fa fa-calendar' },
          component: () => import('../views/CalendarView.vue'),
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

export default router;
