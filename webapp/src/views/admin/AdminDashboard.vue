<template>
  <AdminLayout>
    <div class="admin-dashboard">
      <h1>Dashboard</h1>

      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">{{ stats.totalUsers }}</span>
          <span class="stat-label">Total Users</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.totalPacks }}</span>
          <span class="stat-label">Sample Packs</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.totalSamples }}</span>
          <span class="stat-label">Audio Samples</span>
        </div>
      </div>

      <div class="quick-actions">
        <h2>Quick Actions</h2>
        <div class="actions-grid">
          <router-link :to="{ name: 'admin-users' }" class="action-btn">
            <span class="action-icon">👥</span>
            <span>Manage Users</span>
          </router-link>
          <router-link :to="{ name: 'admin-samples' }" class="action-btn">
            <span class="action-icon">🎵</span>
            <span>Manage Samples</span>
          </router-link>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { onMounted, computed } from "vue";
import AdminLayout from "../../layouts/AdminLayout.vue";
import { useAdminStore } from "../../stores/adminStore";

const adminStore = useAdminStore();
const stats = computed(() => adminStore.stats);

onMounted(() => {
  adminStore.fetchStats();
});
</script>

<style scoped lang="scss">
.admin-dashboard {
  h1 {
    margin: 0 0 24px;
    font-size: 24px;
    font-weight: 600;
    color: var(--color-white);
  }

  h2 {
    margin: 0 0 16px;
    font-size: 18px;
    font-weight: 500;
    color: var(--color-white);
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: var(--color-bg-surface-deep);
  border-radius: var(--radius-lg);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid rgba(122, 15, 62, 0.3);
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
  color: var(--color-accent2);
}

.stat-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.quick-actions {
  background: var(--color-bg-surface-deep);
  border-radius: var(--radius-lg);
  padding: 24px;
  border: 1px solid rgba(122, 15, 62, 0.3);
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: var(--color-bg-primary-dark);
  border-radius: var(--radius-md);
  color: var(--color-white);
  text-decoration: none;
  transition: all 0.15s;

  &:hover {
    background: rgba(122, 15, 62, 0.4);
    transform: translateY(-2px);
  }
}

.action-icon {
  font-size: 24px;
}
</style>
