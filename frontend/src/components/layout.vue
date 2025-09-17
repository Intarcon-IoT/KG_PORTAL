<script>
import topBar from "./top-bar.vue";
import kiLogo from "./ki-logo.vue";
import { kiVersion } from "@/components/system";
import { RouterLink, RouterView } from "vue-router";
import { ref } from "vue";
import router from "@/router";
import { sessionStore } from "@/store";

export default {
  name: "layout",
  components: {
    kiLogo,
    kiVersion,
    topBar,
    RouterLink,
    RouterView,
  },
  setup() {
    const drawer = ref(false);
    const session = sessionStore();

    // Generar el listado de rutas
    const router_list = new Map();
    for (const route of router.getRoutes()) {
      if (route.meta.show !== false &&
        (!route.meta.role ||
          route.meta.role !== "admin" ||
          (route.meta.role === "admin" &&
            session.auth.user?.isAdmin))
      ) {
        const filteredChildren = (route.children || [])
          .filter((child) =>
            !child.meta?.role ||
            child.meta?.role !== "admin" ||
            (child.meta?.role === "admin" && session.auth.user?.isAdmin)
          )
          .map((child) => ({
            name: child.name,
            path: route.path + "/" + child.path,
            role: child.meta?.role ?? null,
          }));

        router_list.set(route.name, {
          name: route.name,
          path: route.path,
          icon: route.meta.icon,
          role: route.meta.role,
          children: filteredChildren,
        });
      }
    }

    return {
      drawer,
      router_list,
    };
  },
  methods: {
    toggleDrawer() {
      this.drawer = !this.drawer;
    },
  },
};
</script>

<template>
  <v-layout>
    <v-navigation-drawer
      v-model="drawer"
      class="menu-sider bg-primary"
      temporary
    >
      <div style="display: grid; grid-template-rows: min-content 1fr min-content; height: 100%">
        <div class="close-btn-parent">
          <kiLogo :size="8.7" sm class="logo-menu" />
          <button @click="drawer = false" class="close-btn">
            <v-icon icon="fas fa-arrow-left" />
          </button>
        </div>

        <div style="min-height: 0; overflow-y: auto">
          <v-list
            density="compact"
            nav
            style="
              padding: 0;
              margin-top: 1rem;
              min-height: 0;
              overflow-y: auto;
            "
          >
            <template v-for="([key, route], i) in router_list" :key="i">
              <template v-if="route.children.length > 0">
                <v-list-group :value="false">
                  <template #activator="{ props }">
                    <v-list-item v-bind="props" class="calendar-list-item">
                      <i
                        class="fa-solid fa-calendar-days menu-calendar"
                        :icon="route.icon"
                      ></i>
                      <v-list-item-title class="menu-calendar menu-item-title">
                        {{ route.name }}
                      </v-list-item-title>
                    </v-list-item>
                  </template>
                  <router-link
                    v-for="child in route.children"
                    :key="child.name"
                    :to="child.path"
                    class="item-links-expand"
                  >
                    {{ child.name }}
                  </router-link>
                </v-list-group>
              </template>
              <template v-else>
                <router-link
                  :to="route.path"
                  class="router-link-without-expand"
                >
                  <v-list-item>
                    <template #prepend>
                      <v-icon :icon="route.icon" class="menu-calendar" />
                    </template>
                    <v-list-item-title class="menu-calendar menu-item-title">
                      {{ route.name }}
                    </v-list-item-title>
                  </v-list-item>
                </router-link>
              </template>
            </template>
          </v-list>
        </div>

        <div class="app-version">
          <kiVersion />
        </div>
      </div>
    </v-navigation-drawer>

    <v-main>
      <topBar @toggle-menu="toggleDrawer" />
      <RouterView />
    </v-main>
  </v-layout>
</template>

<style scoped>
.menu-sider {
  height: 100vh !important;
  position: fixed !important;
}

.router-link-without-expand {
  text-decoration: none;
  color: white;
  display: flex;
  align-items: center;
  padding-left: 16px;
  padding-right: 16px;
  border-radius: 25rem;
}

.logo-menu {
  display: flex;
  font-size: 12px;
  margin-top: 1rem;
  margin-left: 1rem;
}

.menu-calendar {
  color: white;
  font-size: 1.2rem;
}

.item-links-expand {
  display: block;
  padding: 8px 16px;
  color: white;
  text-decoration: none;
}

.item-links-expand:hover {
  background-color: var(--primary-color-hover);
}

.close-btn-parent {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  margin-left: 10rem;
  margin-top: 1rem;
}

.app-version {
  text-align: center;
  margin-bottom: 20px;
}

.menu-item-title {
  white-space: normal !important; /* Permitir múltiples líneas */
  overflow: visible; /* Evitar truncamiento */
  line-height: 1.2; /* Ajustar espaciado entre líneas */
  word-break: break-word; /* Permitir quiebre de palabras */
}

/* Aumentar ligeramente el padding para acomodar múltiples líneas */
.v-list-item {
  padding-top: 8px;
  padding-bottom: 8px;
}
</style>
