<template>
  <header v-if="isAuthenticated" class="app-header">
    <div class="header-welcome">
      <span class="welcome-label">Bonjour,</span>
      <strong class="welcome-name">{{ user?.firstName }}</strong>
    </div>

    <nav class="app-nav">
      <button
        v-for="item in menuItems"
        :key="item.id"
        :class="['nav-button', { 'btn-logout': item.id === 'logout' }]"
        :title="item.name"
        @click="handleMenuClick(item)"
      >
        <span class="nav-label">{{ item.name }}</span>
        <span class="nav-underline"></span>
      </button>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useAuthStore } from "../../stores/authStore.ts";
import apiClient from "../../lib/utils/apiClient.ts";
import { useRouter } from "vue-router";

const { user, isAuthenticated } = storeToRefs(useAuthStore());
const router = useRouter();

const menuItems = [
  { id: "home", name: "Accueil", route: "/" },
  { id: "logout", name: "Déconnexion" },
];

async function handleMenuClick(item: any) {
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
  padding: 24px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  background: rgba(45, 15, 32, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
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
  color: var(--color-accent3-hover);
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
  border-color: var(--color-border-secondary-hover);
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

@media (max-width: 768px) {
  .app-header {
    top: 0;
    margin: 0;
    border-radius: 0 0 16px 16px;
    padding: 12px 16px;
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .header-welcome {
    justify-content: center;
    margin-bottom: 4px;
  }

  .app-nav {
    justify-content: center;
    gap: 6px;
  }

  .nav-button {
    padding: 6px 14px;
    font-size: 0.85rem;
  }
}
</style>
