<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/authStore";
import type { Post } from "../../lib/utils/types";
import AppLayout from "../../layouts/AppLayout.vue";
import TabBar from "../../components/shared/TabBar.vue";
import type { TabItem } from "../../components/shared/TabBar.vue";
import ProfileSettingsForm from "../../components/profile/ProfileSettingsForm.vue";
import ProfilePosts from "../../components/profile/ProfilePosts.vue";
import UserSamplesPanel from "../../components/profile/UserSamplesPanel.vue";

type Tab = "post" | "settings" | "samples";

const activeTab = ref<Tab>("settings");

const profileTabs: TabItem[] = [
  { id: "settings", label: "Profil", icon: "fas fa-user" },
  { id: "post", label: "Mes Posts", icon: "fas fa-newspaper" },
  { id: "samples", label: "Mes Samples", icon: "fas fa-music" },
];

const router = useRouter();
const authStore = useAuthStore();
const user = computed(() => authStore.user);
const isAuthenticated = computed(() => authStore.isAuthenticated);

/* ───────────────────── Statistiques (alimentées par ProfilePosts) ───────────────────── */

const userPosts = ref<Post[]>([]);

const userStats = computed(() => {
  const posts = userPosts.value;
  return {
    totalPosts: posts.length,
    highlightPosts: posts.filter((p: Post) => p.is_highlight).length,
    totalComments: posts.reduce(
      (sum: number, post: Post) => sum + (post.comments?.length || 0),
      0,
    ),
  };
});

const handlePostsChanged = (posts: Post[]) => {
  userPosts.value = posts;
};

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

        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-number">{{ userStats.totalPosts }}</span>
            <span class="stat-label">Posts</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">{{ userStats.highlightPosts }}</span>
            <span class="stat-label">Highlights</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">{{ userStats.totalComments }}</span>
            <span class="stat-label">Commentaires</span>
          </div>
        </div>
      </header>

      <main class="dashboard-content">
        <TabBar v-model="activeTab" :tabs="profileTabs" />

        <ProfilePosts
          v-show="activeTab === 'post'"
          @posts-changed="handlePostsChanged"
        />

        <ProfileSettingsForm v-show="activeTab === 'settings'" />

        <UserSamplesPanel v-show="activeTab === 'samples'" />
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

/* ── Stats ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.stat-card {
  background: var(--color-bg-secondary-dark);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-xl);
  padding: 8px 12px;
  text-align: center;
}

.stat-card:hover {
  border-color: var(--color-accent3-hover);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-accent);
}

.stat-label {
  color: var(--color-white-light);
  opacity: 0.7;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
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

  .stats-grid {
    gap: 12px;
  }
}
</style>
