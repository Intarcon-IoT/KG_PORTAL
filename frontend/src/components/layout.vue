<!-- Estructura del portal con sesión: barra superior con el menú siempre visible y contenido -->
<script setup>
import { computed, ref } from 'vue'
import { useDisplay } from 'vuetify'
import { RouterView, useRoute, useRouter } from 'vue-router'
import logo from '@/assets/logo.svg'
import { appVersion } from '@/components/system'
import { sessionStore, useBookingStore, useNotificationStore } from '@/store'
import { ROLES } from '@/utils/constants'

// useRouter y no el import de @/router: el router importa este componente
const router = useRouter()
const route = useRoute()
const session = sessionStore()
const bookingStore = useBookingStore()
const notificationStore = useNotificationStore()
const { mdAndUp } = useDisplay()

const drawer = ref(false)

const user = computed(() => session.auth.user || {})
const initials = computed(() => (user.value.name || user.value.mail || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase())

const canSee = meta => !meta.role || user.value.role === ROLES.ADMIN || [].concat(meta.role).includes(user.value.role || ROLES.USER)

// Menú agrupado por meta.section a partir de las rutas hijas del layout
const sections = computed(() => {
  const home = router.getRoutes().find(r => r.name === 'Home')
  const groups = new Map()
  for (const child of home?.children || []) {
    const meta = child.meta || {}
    if (meta.show === false || !canSee(meta)) continue
    if (!groups.has(meta.section)) groups.set(meta.section, [])
    groups.get(meta.section).push({ name: child.name, title: meta.title || child.name, icon: meta.icon, badge: meta.badge === 'pending' ? bookingStore.pendingCount : 0 })
  }
  return [...groups].map(([title, items]) => ({
    title: title || items[0].title,
    items,
    badge: items.reduce((sum, item) => sum + item.badge, 0),
    active: items.some(item => item.name === route.name),
  }))
})

const go = name => { drawer.value = false; router.push({ name }) }

const logout = () => {
  session.auth.logout().then(() => {
    notificationStore.notifySuccess('Has cerrado sesión')
    router.push({ name: 'Log In' })
  })
}
</script>

<template>
  <v-layout class="app-shell">
    <header class="topbar">
      <button v-if="!mdAndUp" type="button" class="topbar-toggle" :aria-label="drawer ? 'Cerrar menú' : 'Abrir menú'" @click="drawer = !drawer"><i :class="drawer ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'" /></button>

      <router-link to="/" class="topbar-brand" aria-label="Inicio">
        <img :src="logo" alt="KEYTER Group" />
      </router-link>

      <nav v-if="mdAndUp" class="topbar-nav">
        <template v-for="section in sections" :key="section.title">
          <router-link v-if="section.items.length === 1" :to="{ name: section.items[0].name }" class="topnav-link" :class="{ active: section.active }">
            {{ section.title }}
            <span v-if="section.badge" class="topnav-badge">{{ section.badge }}</span>
          </router-link>

          <v-menu v-else location="bottom start" offset="6" open-on-hover :close-delay="120">
            <template #activator="{ props }">
              <button type="button" class="topnav-link" :class="{ active: section.active }" v-bind="props">
                {{ section.title }}
                <span v-if="section.badge" class="topnav-badge">{{ section.badge }}</span>
                <i class="fa-solid fa-chevron-down topnav-caret" />
              </button>
            </template>
            <div class="dropdown">
              <button v-for="item in section.items" :key="item.name" type="button" class="dropdown-item" :class="{ active: item.name === route.name }" @click="go(item.name)">
                <i :class="item.icon" />
                <span>{{ item.title }}</span>
                <span v-if="item.badge" class="dropdown-badge">{{ item.badge }}</span>
              </button>
            </div>
          </v-menu>
        </template>
      </nav>

      <div class="topbar-spacer" />

      <v-menu location="bottom end" offset="8">
        <template #activator="{ props }">
          <button type="button" class="topbar-user" v-bind="props" aria-label="Menú de usuario">
            <span v-if="mdAndUp" class="topbar-user-name">{{ user.name }}</span>
            <span class="avatar">{{ initials }}</span>
          </button>
        </template>
        <div class="dropdown dropdown-user">
          <div class="dropdown-head">
            <span class="avatar avatar-lg">{{ initials }}</span>
            <span class="dropdown-head-text">
              <strong>{{ user.name }}</strong>
              <small>{{ user.mail }}</small>
            </span>
          </div>
          <button type="button" class="dropdown-item" @click="go('Mi Cuenta')"><i class="fa-regular fa-user" /><span>Mi cuenta</span></button>
          <button type="button" class="dropdown-item" @click="logout"><i class="fa-solid fa-arrow-right-from-bracket" /><span>Cerrar sesión</span></button>
          <div class="dropdown-foot"><span>Portal KEYTER Group</span><appVersion /></div>
        </div>
      </v-menu>
    </header>

    <!-- El cajón queda bajo la barra superior, que sigue visible para cerrarlo -->
    <v-navigation-drawer v-if="!mdAndUp" v-model="drawer" temporary width="300" color="#111111" class="mobile-nav">
      <nav class="mobile-nav-body">
        <div v-for="section in sections" :key="section.title" class="mobile-section">
          <span class="mobile-section-title">{{ section.title }}</span>
          <button v-for="item in section.items" :key="item.name" type="button" class="mobile-item" :class="{ active: item.name === route.name }" @click="go(item.name)">
            <i :class="item.icon" />
            <span>{{ item.title }}</span>
            <span v-if="item.badge" class="topnav-badge">{{ item.badge }}</span>
          </button>
        </div>
      </nav>
    </v-navigation-drawer>

    <v-main class="app-main">
      <RouterView />
    </v-main>
  </v-layout>
</template>

<style scoped>
.app-shell { min-height: 100dvh; background: #f6f7f9 }

/* Barra superior */
.topbar {
  position: fixed;
  inset: 0 0 auto 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
  height: var(--topbar-height);
  padding: 0 24px;
  background: #111111;
  color: #ffffff;
}

.topbar-brand { display: flex; align-items: center; margin-right: 28px }
.topbar-brand img { height: 32px; width: auto }

.topbar-nav { display: flex; align-items: stretch; align-self: stretch; gap: 6px }

.topnav-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 100%;
  padding: 0 14px;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, .72);
  font: inherit;
  font-size: .925rem;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition: color .15s;
}

.topnav-link::after { content: ''; position: absolute; left: 14px; right: 14px; bottom: 0; height: 3px; border-radius: 3px 3px 0 0; background: #5bb133; opacity: 0; transform: scaleX(.3); transition: opacity .2s, transform .2s }
.topnav-link:hover, .topnav-link[aria-expanded='true'] { color: #ffffff }
.topnav-link.active { color: #ffffff }
.topnav-link.active::after { opacity: 1; transform: scaleX(1) }
.topnav-caret { font-size: .6rem; opacity: .6 }

.topnav-badge { min-width: 20px; padding: 1px 6px; border-radius: 999px; background: #5bb133; color: #0b1a05; font-size: .7rem; font-weight: 700; line-height: 1.4; text-align: center }

.topbar-spacer { flex: 1 }

.topbar-user { display: flex; align-items: center; gap: 10px; padding: 4px 4px 4px 12px; border: 0; border-radius: 999px; background: transparent; color: #ffffff; font: inherit; cursor: pointer; transition: background-color .15s }
.topbar-user:hover, .topbar-user[aria-expanded='true'] { background: rgba(255, 255, 255, .08) }
.topbar-user-name { max-width: 200px; overflow: hidden; font-size: .875rem; font-weight: 500; text-overflow: ellipsis; white-space: nowrap }

.avatar { display: grid; place-items: center; flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%; background: #5bb133; color: #0b1a05; font-size: .75rem; font-weight: 700; letter-spacing: .02em }
.avatar-lg { width: 40px; height: 40px; font-size: .85rem }

.topbar-toggle { display: grid; place-items: center; width: 38px; height: 38px; margin-right: 8px; border: 0; border-radius: 10px; background: rgba(255, 255, 255, .08); color: #ffffff; cursor: pointer }

/* Desplegables */
.dropdown { min-width: 220px; padding: 6px; border: 1px solid #eceef2; border-radius: 12px; background: #ffffff; box-shadow: 0 16px 40px -12px rgba(15, 23, 42, .3) }
.dropdown-user { min-width: 260px }

.dropdown-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 10px; border: 0; border-radius: 8px; background: transparent; color: #334155; font: inherit; font-size: .875rem; text-align: left; cursor: pointer; transition: background-color .12s }
.dropdown-item i { width: 16px; color: #64748b; text-align: center }
.dropdown-item span:first-of-type { flex: 1 }
.dropdown-item:hover { background: #f4f5f7; color: #111111 }
.dropdown-item.active { background: #f1f5ee; color: #111111; font-weight: 600 }
.dropdown-item.active i { color: #468131 }
.dropdown-badge { min-width: 20px; padding: 1px 6px; border-radius: 999px; background: #111111; color: #ffffff; font-size: .7rem; font-weight: 700; text-align: center }

.dropdown-head { display: flex; align-items: center; gap: 12px; padding: 10px 10px 12px; margin-bottom: 4px; border-bottom: 1px solid #f1f2f4 }
.dropdown-head-text { display: flex; flex-direction: column; min-width: 0 }
.dropdown-head-text strong { font-size: .9rem; color: #111111 }
.dropdown-head-text small { font-size: .78rem; color: #64748b; overflow-wrap: anywhere }

.dropdown-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 10px 4px; margin-top: 4px; border-top: 1px solid #f1f2f4; font-size: .72rem; font-weight: 500; color: #94a3b8 }

/* Menú en móvil */
.mobile-nav-body { padding: calc(var(--topbar-height) + 16px) 12px 16px; border-top: 1px solid rgba(255, 255, 255, .08) }
.mobile-section + .mobile-section { margin-top: 20px }
.mobile-section-title { display: block; padding: 0 12px 8px; font-size: .68rem; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: rgba(255, 255, 255, .4) }
.mobile-item { display: flex; align-items: center; gap: 12px; width: 100%; height: 44px; padding: 0 12px; border: 0; border-radius: 10px; background: transparent; color: rgba(255, 255, 255, .75); font: inherit; font-size: .925rem; font-weight: 500; text-align: left; cursor: pointer }
.mobile-item i { width: 20px; text-align: center }
.mobile-item span:first-of-type { flex: 1 }
.mobile-item.active { background: rgba(255, 255, 255, .1); color: #ffffff }

/* Contenido bajo la barra fija */
.app-main { padding-top: var(--topbar-height) !important; background: #f6f7f9; color: #111111 }

@media (width < 960px) {
  .topbar { padding: 0 12px }
  .topbar-brand { margin: 0 auto }
  .topbar-brand img { height: 28px }
}
</style>
