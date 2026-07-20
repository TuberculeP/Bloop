<template>
  <header v-if="isAuthenticated" class="app-header">
    <div class="header-top">
      <div class="header-welcome">
        <span class="welcome-label">Bonjour,</span>
        <strong class="welcome-name">{{ user?.firstName }}</strong>
      </div>

      <button
        class="burger-btn"
        :class="{ active: isMenuOpen }"
        @click="isMenuOpen = !isMenuOpen"
        aria-label="Ouvrir le menu"
        :aria-expanded="isMenuOpen"
      >
        <i :class="isMenuOpen ? 'fas fa-times' : 'fas fa-bars'"></i>
      </button>
    </div>

    <div
      v-if="isMenuOpen"
      class="nav-backdrop"
      @click="isMenuOpen = false"
    ></div>

    <nav class="app-nav" :class="{ 'nav-open': isMenuOpen }">
      <button
        v-for="item in menuItems"
        :key="item.id"
        :class="[
          'nav-button',
          { 'btn-logout': item.id === 'logout' },
          { 'btn-active': currentPath === item.route },
        ]"
        :title="item.name"
        @click="handleMenuClick(item)"
      >
        <i v-if="item.icon" :class="item.icon"></i>
        <span class="nav-label">{{ item.name }}</span>
        <span class="nav-underline"></span>
      </button>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";
import { useAuthStore } from "../../stores/authStore.ts";
import apiClient from "../../lib/utils/apiClient.ts";
import { useRoute, useRouter } from "vue-router";

const { user, isAuthenticated } = storeToRefs(useAuthStore());
const router = useRouter();

const route = useRoute();
const currentPath = route.path;

const isMenuOpen = ref(false);

const menuItems = computed(() =>
  [
    { id: "home", icon: "fas fa-home", name: "Accueil", route: "/" },
    { id: "app", icon: "fas fa-th-large", name: "Application", route: "/app" },
    { id: "blog", icon: "fas fa-newspaper", name: "Blog", route: "/blog" },
    {
      id: "learning",
      icon: "fas fa-graduation-cap",
      name: "Learning",
      route: "/learning",
    },
    {
      id: "messages",
      icon: "fas fa-envelope",
      name: "Messagerie",
      route: "/messages",
    },
    { id: "profile", icon: "fas fa-user", name: "Profil", route: "/profile" },
    {
      id: "admin",
      icon: "fas fa-user",
      name: "Admin",
      route: "/admin",
      isVisible: user?.value?.role === "ROLE_ADMIN",
    },
    { id: "logout", icon: "fas fa-sign-out-alt", name: "Déconnexion" },
  ].filter((item) => item.isVisible !== false),
);

async function handleMenuClick(item: any) {
  isMenuOpen.value = false;
  if (item.id === "logout") {
    await disconnect();
  } else if (item.route) {
    await router.push(item.route);
  }
}

async function disconnect() {
  const result = await apiClient.post("/auth/logout");
  if (result.data) {
    console.log("Déconnexion réussie");
    user.value = undefined;
    window.location.reload();
  } else {
    console.error("Erreur lors de la déconnexion :", result.error);
  }
}
</script>

<style scoped>
p,
span {
  font-size: 16px;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 100;

  padding: 18px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  background: rgba(45, 15, 32, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
}

.header-top {
  display: contents;
}

.header-welcome {
  height: 50px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.welcome-label {
  color: var(--color-white-light);
  opacity: 0.7;
  font-weight: 400;
}

.welcome-name {
  font-size: 1rem;
  color: var(--color-accent);
  font-weight: 700;
  letter-spacing: 0.3px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.app-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.nav-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 50px;
  color: var(--color-white-light);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  position: relative;
  overflow: hidden;
}

.nav-button:not(.btn-logout):hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-white);
  border-color: var(--color-secondary-hover);
  transform: translateY(-1px);
}

.nav-button.btn-active {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-white);
  border-color: var(--color-secondary-hover);
  transform: translateY(-1px);
}

.nav-button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.btn-logout {
  color: var(--color-white-light);
  opacity: 0.8;
  border-color: transparent;
}

.btn-logout:hover {
  background: rgba(215, 38, 109, 0.15);
  color: var(--color-error-hover);
  border-color: rgba(215, 38, 109, 0.3);
  transform: translateY(-1px);
}

.nav-underline {
  position: absolute;
  bottom: 0.5rem;
  left: 50%;
  transform: translateX(-50%) scaleX(0);
  width: 30px;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--color-accent),
    transparent
  );
  border-radius: 2px;
  transition: transform 0.3s ease;
}

.nav-link:hover .nav-underline {
  transform: translateX(-50%) scaleX(1);
}

.burger-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: var(--color-white);
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.burger-btn:hover,
.burger-btn.active {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--color-secondary-hover);
}

.nav-backdrop {
  display: none;
}

@media (max-width: 768px) {
  .app-header {
    position: sticky;
    top: 0;
    padding: 12px 16px;
  }

  .header-top {
    display: flex;
    width: 100%;
    justify-content: space-between;
    align-items: center;
  }

  .header-welcome {
    justify-content: flex-start;
  }

  .burger-btn {
    display: flex;
  }

  .nav-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    top: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 99;
  }

  .app-nav {
    position: absolute;
    top: 100%;
    left: 12px;
    right: 12px;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    gap: 4px;

    background: rgba(45, 15, 32, 0.97);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-xl);
    padding: 8px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);

    max-height: 0;
    overflow: hidden;
    opacity: 0;
    margin-top: 0;
    pointer-events: none;
    transform: translateY(-8px);
    transition:
      max-height 0.25s ease,
      opacity 0.2s ease,
      transform 0.2s ease,
      margin-top 0.25s ease;
  }

  .app-nav.nav-open {
    max-height: 70vh;
    opacity: 1;
    margin-top: 8px;
    pointer-events: auto;
    transform: translateY(0);
    overflow-y: auto;
  }

  .nav-button {
    width: 100%;
    justify-content: flex-start;
    padding: 12px 16px;
  }

  .nav-underline {
    display: none;
  }
}
</style>
