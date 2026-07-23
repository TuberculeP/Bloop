<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import apiClient from "../../lib/utils/apiClient";
import AppLayout from "../../layouts/AppLayout.vue";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseSpinner from "../../components/ui/BaseSpinner.vue";
import EmptyState from "../../components/ui/EmptyState.vue";
import { formatLongDate } from "../../lib/utils/dateFormatter";

interface PublicProfileProject {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface PublicProfile {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  createdAt: string;
  projects: PublicProfileProject[];
}

const route = useRoute();
const router = useRouter();

const profile = ref<PublicProfile | null>(null);
const isLoading = ref(true);
const error = ref<string | null>(null);

const slug = computed(() =>
  Array.isArray(route.params.slug) ? route.params.slug[0] : route.params.slug,
);

const loadProfile = async () => {
  try {
    isLoading.value = true;
    error.value = null;

    const { data, error: apiError } = await apiClient.get<{
      body: PublicProfile;
    }>(`/user/${slug.value}/profile`);

    if (apiError || !data) {
      throw new Error(apiError || "Profil introuvable");
    }

    profile.value = data.body;
  } catch (err) {
    console.error("Erreur lors du chargement du profil:", err);
    error.value = "Profil introuvable";
    profile.value = null;
  } finally {
    isLoading.value = false;
  }
};

const openProject = (projectId: string) => {
  // À adapter selon la route réelle de consultation d'un projet public.
  router.push(`/studio/${projectId}`);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

onMounted(loadProfile);
</script>

<template>
  <AppLayout>
    <div class="page-container">
      <div class="profile-navigation">
        <BaseButton
          variant="ghost"
          @click="router.back()"
          label="Retour"
          left-icon="fas fa-arrow-left"
        />
      </div>

      <div v-if="isLoading" class="loading-state">
        <BaseSpinner size="large" />
      </div>

      <EmptyState
        v-else-if="error || !profile"
        title="Erreur"
        :message="error || 'Profil introuvable'"
      />

      <div v-else class="profile-content">
        <header class="dashboard-header">
          <div class="profile-info">
            <div class="profile-avatar-large">
              <img
                v-if="profile.avatar"
                :src="profile.avatar"
                :alt="`${profile.firstName} ${profile.lastName}`"
                class="avatar-image"
              />
              <span v-else class="avatar-initials">
                {{ profile.firstName?.charAt(0)
                }}{{ profile.lastName?.charAt(0) }}
              </span>
            </div>
            <div class="profile-details">
              <h1 class="main-title">
                {{ profile.firstName }}
                <span class="highlight">{{ profile.lastName }}</span>
              </h1>
              <p class="tagline" style="font-size: 0.9rem">
                Membre depuis {{ formatLongDate(profile.createdAt) }}
              </p>
            </div>
          </div>

          <div class="stat-card">
            <span class="stat-number">{{ profile.projects.length }}</span>
            <span class="stat-label">Projets publics</span>
          </div>
        </header>

        <main class="dashboard-content">
          <EmptyState
            v-if="profile.projects.length === 0"
            title="Aucun projet public"
            :message="`${profile.firstName} n'a encore rendu aucun projet public.`"
          />

          <div v-else class="projects-grid">
            <div
              v-for="project in profile.projects"
              :key="project.id"
              class="project-card public-card"
              @click="openProject(project.id)"
            >
              <div class="card-visual">
                <div class="waveform">
                  <span
                    v-for="n in 12"
                    :key="n"
                    :style="{
                      height: Math.random() * 100 + '%',
                      animationDelay: n * 0.1 + 's',
                    }"
                  ></span>
                </div>
              </div>

              <div class="card-content">
                <div class="card-meta">
                  <span class="badge owner-badge">Public</span>
                  <span class="date">{{ formatDate(project.updatedAt) }}</span>
                </div>
                <h3 class="card-title">{{ project.name }}</h3>
                <div class="card-footer">
                  <div class="open-hint">
                    <span class="click-hint">Ouvrir</span>
                    <i class="fas fa-arrow-right click-hint"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.profile-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border-secondary);
  flex-wrap: wrap;
  gap: 1rem;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 3rem 1rem;
}

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

.avatar-initials {
  text-transform: uppercase;
}

/* ── Stat (nombre de projets publics) ── */
.stat-card {
  background: var(--color-bg-secondary-dark);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-xl);
  padding: 8px 24px;
  text-align: center;
  transition: all 0.2s ease;
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

/* ── Grille de projets (style "Découvrir" du dashboard) ── */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.project-card {
  background: var(--color-bg-secondary-dark);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-xl);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  display: flex;
  flex-direction: column;
}

.public-card:hover {
  transform: translateY(-8px);
  border-color: var(--color-accent);
  box-shadow: var(--shadow-lg);
  background: linear-gradient(
    180deg,
    rgba(0, 120, 180, 0.1) 0%,
    var(--color-bg-secondary-dark) 100%
  );
}

.card-visual {
  height: 140px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 20px;
  border-bottom: 1px solid var(--color-border-secondary);
}

.waveform span {
  display: block;
  width: 6px;
  background: var(--color-accent);
  border-radius: var(--radius-sm);
  animation: wave 1.5s ease-in-out infinite;
  opacity: 0.6;
}

.public-card:hover .waveform span {
  opacity: 1;
}

@keyframes wave {
  0%,
  100% {
    transform: scaleY(0.3);
  }
  50% {
    transform: scaleY(1);
  }
}

.card-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 12px;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.badge {
  background: rgba(var(--color-accent3-rgb), 0.3);
  color: var(--color-secondary);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-weight: 700;
}

.owner-badge {
  background: rgba(0, 100, 160, 0.2);
  color: var(--color-accent);
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.8rem;
}

.date {
  color: var(--color-white-light);
}

.card-title {
  color: var(--color-white);
  font-size: 1.25rem;
  line-height: 1.3;
}

.card-footer {
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.open-hint {
  display: flex;
  align-items: center;
  gap: 8px;
}

.click-hint {
  color: var(--color-accent);
  font-size: 0.9rem;
  font-weight: 600;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s ease;
}

.public-card:hover .click-hint {
  opacity: 1;
  transform: translateX(0);
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

  .projects-grid {
    grid-template-columns: 1fr;
  }
}
</style>
