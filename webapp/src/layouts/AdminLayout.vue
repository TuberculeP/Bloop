<template>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <div class="sidebar-header">
        <h2>Admin Panel</h2>
      </div>
      <nav class="sidebar-nav">
        <router-link :to="{ name: 'admin-dashboard' }" class="nav-item">
          <span class="nav-icon">📊</span>
          Dashboard
        </router-link>
        <router-link :to="{ name: 'admin-users' }" class="nav-item">
          <span class="nav-icon">👥</span>
          Users
        </router-link>
        <router-link :to="{ name: 'admin-samples' }" class="nav-item">
          <span class="nav-icon">🎵</span>
          Sample Library
        </router-link>
        <router-link :to="{ name: 'admin-projects' }" class="nav-item">
          <span class="nav-icon"><i class="fas fa-file-export"></i></span>
          Projects
        </router-link>
        <div class="nav-spacer"></div>
        <router-link :to="{ name: 'landing-main' }" class="nav-item nav-back">
          <span class="nav-icon">←</span>
          Back to App
        </router-link>
      </nav>
    </aside>
    <main class="admin-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: var(--color-bg-primary-dark);
}

.admin-sidebar {
  width: 250px;
  background: var(--color-bg-surface-deep);
  border-right: 1px solid rgba(122, 15, 62, 0.5);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid rgba(122, 15, 62, 0.5);

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--color-white);
  }
}

.sidebar-nav {
  flex: 1;
  padding: 16px 0;
  display: flex;
  flex-direction: column;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: all 0.15s;
  font-size: 14px;

  &:hover {
    background: rgba(122, 15, 62, 0.3);
    color: var(--color-accent2);
  }

  &.router-link-exact-active {
    background: rgba(122, 15, 62, 0.5);
    color: var(--color-white);
    border-left: 3px solid var(--color-accent2);
    padding-left: 17px;
  }
}

.nav-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.nav-spacer {
  flex: 1;
}

.nav-back {
  border-top: 1px solid rgba(122, 15, 62, 0.3);
  margin-top: auto;
}

.admin-main {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  max-height: 100vh;
}

@media (max-width: 768px) {
  .admin-layout {
    flex-direction: column;
    min-height: auto;
  }

  .admin-sidebar {
    width: 100%;
  }

  .sidebar-nav {
    flex-direction: row;
    overflow-x: auto;
    padding: 8px;
  }

  .nav-spacer {
    display: none;
  }

  .nav-back {
    border-top: none;
    margin-top: 0;
  }

  .admin-main {
    max-height: none;
  }
}
</style>
