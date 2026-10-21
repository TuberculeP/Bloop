<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/authStore";
import AppLayout from "../../layouts/AppLayout.vue";
import TabBar from "../../components/shared/TabBar.vue";
import type { TabItem } from "../../components/shared/TabBar.vue";
import ProfileSettingsForm from "../../components/profile/ProfileSettingsForm.vue";
import UserSamplesPanel from "../../components/profile/UserSamplesPanel.vue";
import ProfileLearningArticles from "../../components/profile/ProfileLearningArticles.vue";

type Tab = "settings" | "samples" | "learning";

const activeTab = ref<Tab>("settings");

const router = useRouter();
const authStore = useAuthStore();
const user = computed(() => authStore.user);
const isAuthenticated = computed(() => authStore.isAuthenticated);

const profileTabs = computed<TabItem[]>(() => {
  const tabs: TabItem[] = [
    { id: "settings", label: "Profil", icon: "fas fa-user" },
    { id: "samples", label: "Mes Samples", icon: "fas fa-music" },
  ];

  if (user.value?.role === "ROLE_ADMIN") {
    tabs.push({
      id: "learning",
      label: "Mes Articles",
      icon: "fas fa-graduation-cap",
    });
  }

  return tabs;
});

const formatDate = (dateString?: string) => {
  if (!dateString) return "date inconnue";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "date inconnue";
  return date.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

onMounted(() => {
  if (!isAuthenticated.value) {
    router.push("/login");
  }
});
</script>

<template>
  <AppLayout>
    <div class="page-container">
      <header class="dashboard-header">
        <div class="profile-info">
          <div class="profile-avatar-large">
            <img
              v-if="user?.profilePicture"
              :src="user.profilePicture"
              :alt="`${user?.firstName} ${user?.lastName}`"
              class="avatar-image"
            />
            <span v-else class="avatar-initials">
              {{ user?.firstName?.charAt(0) }}{{ user?.lastName?.charAt(0) }}
            </span>
          </div>
          <div class="profile-details">
            <h1 class="main-title">
              {{ user?.firstName }}
              <span class="highlight">{{ user?.lastName }}</span>
            </h1>
            <p class="tagline" style="font-size: 0.9rem">
              Membre depuis {{ formatDate(user?.createdAt?.toString()) }}
            </p>
          </div>
        </div>
      </header>

      <main class="dashboard-content">
        <TabBar v-model="activeTab" :tabs="profileTabs" />

        <ProfileSettingsForm v-show="activeTab === 'settings'" />

        <UserSamplesPanel v-show="activeTab === 'samples'" />

        <ProfileLearningArticles v-show="activeTab === 'learning'" />
      </main>
    </div>
  </AppLayout>
</template>

<style scoped>
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 48px;
  flex-wrap: wrap;
  gap: 20px;
}

.main-title {
  font-size: 2.5rem;
  color: var(--color-white);
  margin: 0;
  letter-spacing: -1px;
}

.highlight {
  color: var(--color-accent3-hover);
  position: relative;
  display: inline-block;
}

.tagline {
  color: var(--color-white-light);
  opacity: 0.7;
  margin: 8px 0 0 0;
  font-size: 1.1rem;
}

/* ── Avatar ── */
.profile-info {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.profile-avatar-large {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--color-accent3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-white);
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 4px 15px rgba(122, 15, 62, 0.4);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
  }

  .profile-info {
    flex-direction: column;
    text-align: center;
  }
}
</style>
