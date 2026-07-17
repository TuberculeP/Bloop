<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useProjectStore } from "../../stores/projectStore";
import apiClient from "../../lib/utils/apiClient";
import LoadingCard from "../shared/LoadingCard.vue";
import BaseButton from "../ui/BaseButton.vue";
import BaseModal from "../ui/BaseModal.vue";
import type {
  ProjectListItem,
  PublicProjectListItem,
  FavoriteProjectListItem,
  TrashedProjectListItem,
} from "../../lib/utils/types";
import TabBar, { type TabItem } from "../shared/TabBar.vue";

type Tab = "mine" | "favorites" | "discover" | "trash";

const emit = defineEmits<{
  (e: "new-project"): void;
  (e: "select-project", projectId: string): void;
  (e: "select-public-project", projectId: string): void;
}>();

const projectStore = useProjectStore();

const tabs: TabItem[] = [
  { id: "mine", label: "Mes projets", icon: "fas fa-folder" },
  { id: "favorites", label: "Favoris", icon: "fas fa-heart" },
  { id: "discover", label: "Découvrir", icon: "fas fa-globe" },
  { id: "trash", label: "Corbeille", icon: "fas fa-trash" },
];

const activeTab = ref<Tab>("mine");

const projects = ref<ProjectListItem[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const togglingMcp = ref<string | null>(null);
const togglingVisibility = ref<string | null>(null);

const publicProjects = ref<PublicProjectListItem[]>([]);
const publicLoading = ref(false);
const publicError = ref<string | null>(null);

const favoriteProjects = ref<FavoriteProjectListItem[]>([]);
const favoritesLoading = ref(false);
const favoritesError = ref<string | null>(null);
const togglingFavorite = ref<string | null>(null);

const trashProjects = ref<TrashedProjectListItem[]>([]);
const trashLoading = ref(false);
const trashError = ref<string | null>(null);
const restoringProject = ref<string | null>(null);
const pendingDeleteId = ref<string | null>(null);
const isDeleting = ref(false);

const loadProjects = async () => {
  loading.value = true;
  error.value = null;
  const result = await projectStore.getProjects();
  if (result.success && result.data) {
    projects.value = result.data;
  } else {
    error.value = result.error || "Impossible de charger la bibliothèque";
  }
  loading.value = false;
};

const loadPublicProjects = async () => {
  publicLoading.value = true;
  publicError.value = null;
  const result = await projectStore.getPublicProjects();
  if (result.success && result.data) {
    publicProjects.value = result.data;
  } else {
    publicError.value =
      result.error || "Impossible de charger les projets publics";
  }
  publicLoading.value = false;
};

const loadFavorites = async () => {
  favoritesLoading.value = true;
  favoritesError.value = null;
  const result = await projectStore.getFavoriteProjects();
  if (result.success && result.data) {
    favoriteProjects.value = result.data;
  } else {
    favoritesError.value = result.error || "Impossible de charger les favoris";
  }
  favoritesLoading.value = false;
};

const loadTrash = async () => {
  trashLoading.value = true;
  trashError.value = null;
  const result = await projectStore.getTrashedProjects();
  if (result.success && result.data) {
    trashProjects.value = result.data;
  } else {
    trashError.value = result.error || "Impossible de charger la corbeille";
  }
  trashLoading.value = false;
};

const daysRemaining = (deletedAt: string): number => {
  const expiry = new Date(
    new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000,
  );
  return Math.max(
    0,
    Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );
};

const handleDeleteClick = (projectId: string, event: Event) => {
  event.stopPropagation();
  pendingDeleteId.value = projectId;
};

const cancelDelete = () => {
  pendingDeleteId.value = null;
};

const executeDelete = async () => {
  if (!pendingDeleteId.value || isDeleting.value) return;
  isDeleting.value = true;
  const result = await projectStore.deleteProject(pendingDeleteId.value);
  if (result.success) {
    projects.value = projects.value.filter(
      (p) => p.id !== pendingDeleteId.value,
    );
    pendingDeleteId.value = null;
  }
  isDeleting.value = false;
};

const handleRestore = async (projectId: string, event: Event) => {
  event.stopPropagation();
  if (restoringProject.value) return;
  restoringProject.value = projectId;
  const result = await projectStore.restoreProject(projectId);
  if (result.success) {
    trashProjects.value = trashProjects.value.filter((p) => p.id !== projectId);
  }
  restoringProject.value = null;
};

watch(activeTab, (tab) => {
  if (tab === "mine") loadProjects();
  if (tab === "discover") loadPublicProjects();
  if (tab === "favorites") loadFavorites();
  if (tab === "trash") loadTrash();
});

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toggleMcp = async (project: ProjectListItem, event: Event) => {
  event.stopPropagation();
  if (togglingMcp.value) return;
  togglingMcp.value = project.id;
  const { error } = await apiClient.patch<{ body: { mcpEnabled: boolean } }>(
    `/app/projects/${project.id}/mcp`,
    { mcpEnabled: !project.mcpEnabled },
  );
  if (!error) {
    project.mcpEnabled = !project.mcpEnabled;
  }
  togglingMcp.value = null;
};

const toggleVisibility = async (project: ProjectListItem, event: Event) => {
  event.stopPropagation();
  if (togglingVisibility.value) return;
  togglingVisibility.value = project.id;
  const { error } = await apiClient.patch<{ body: { isPublic: boolean } }>(
    `/app/projects/${project.id}/visibility`,
    { isPublic: !project.isPublic },
  );
  if (!error) {
    project.isPublic = !project.isPublic;
  }
  togglingVisibility.value = null;
};

const isFavoritedMap = ref<Record<string, boolean>>({});

const toggleFavorite = async (projectId: string, event: Event) => {
  event.stopPropagation();
  if (togglingFavorite.value) return;
  togglingFavorite.value = projectId;

  const isFavorited =
    favoriteProjects.value.some((f) => f.id === projectId) ||
    isFavoritedMap.value[projectId];

  let result;
  if (isFavorited) {
    result = await projectStore.removeFavorite(projectId);
    if (result.success) {
      favoriteProjects.value = favoriteProjects.value.filter(
        (f) => f.id !== projectId,
      );
      isFavoritedMap.value[projectId] = false;
    }
  } else {
    result = await projectStore.addFavorite(projectId);
    if (result.success) {
      isFavoritedMap.value[projectId] = true;
      if (activeTab.value === "favorites") {
        await loadFavorites();
      }
    }
  }

  togglingFavorite.value = null;
};

const isProjectFavorited = (projectId: string) => {
  return (
    favoriteProjects.value.some((f) => f.id === projectId) ||
    !!isFavoritedMap.value[projectId]
  );
};

onMounted(() => loadProjects());
</script>

<template>
  <div class="page-container">
    <header class="dashboard-header">
      <div class="header-content">
        <h1 class="main-title">
          Bloop<span class="highlight">Sequencer</span>
        </h1>
        <p class="tagline">Votre bibliothèque de compositions</p>
      </div>
      <BaseButton class="new-project-btn" @click="emit('new-project')">
        <i class="fas fa-plus" />Nouveau projet
      </BaseButton>
    </header>

    <TabBar v-model="activeTab" :tabs="tabs" />

    <main class="dashboard-content">
      <!-- Onglet Mes projets -->
      <template v-if="activeTab === 'mine'">
        <div v-if="loading" class="state-container">
          <LoadingCard />
        </div>

        <div v-else-if="error" class="state-container error">
          <div class="error-box">
            <h3>Oups, quelque chose s'est mal passé</h3>
            <p>{{ error }}</p>
            <button @click="loadProjects" class="btn-text-accent">
              Réessayer le chargement
            </button>
          </div>
        </div>

        <div v-else-if="projects.length === 0" class="state-container empty">
          <div class="music-note">♪</div>
          <h3>Bibliothèque vide</h3>
          <p>Commencez votre première composition musicale dès maintenant.</p>
          <BaseButton variant="ghost" @click="emit('new-project')">
            Créer mon premier projet
          </BaseButton>
        </div>

        <div v-else class="projects-grid">
          <div
            v-for="project in projects"
            :key="project.id"
            class="project-card"
            @click="emit('select-project', project.id)"
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
                <span class="badge">Projet</span>
                <span class="date">{{ formatDate(project.updatedAt) }}</span>
              </div>
              <h3 class="card-title">{{ project.name }}</h3>
              <div class="card-footer">
                <div class="card-toggles">
                  <button
                    class="icon-toggle"
                    :class="{ active: project.mcpEnabled }"
                    :disabled="togglingMcp === project.id"
                    @click="toggleMcp(project, $event)"
                    title="Contrôle MCP"
                  >
                    <i class="fas fa-robot" />
                  </button>
                  <button
                    class="icon-toggle"
                    :class="{ active: project.isPublic }"
                    :disabled="togglingVisibility === project.id"
                    @click="toggleVisibility(project, $event)"
                    :title="
                      project.isPublic ? 'Projet public' : 'Rendre public'
                    "
                  >
                    <i class="fas fa-globe" />
                  </button>
                  <button
                    class="icon-toggle delete-btn"
                    @click="handleDeleteClick(project.id, $event)"
                    title="Supprimer"
                  >
                    <i class="fas fa-trash" />
                  </button>
                </div>
                <div class="open-hint">
                  <span class="click-hint">Ouvrir</span>
                  <i class="fas fa-arrow-right click-hint"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Onglet Favoris -->
      <template v-else-if="activeTab === 'favorites'">
        <div v-if="favoritesLoading" class="state-container">
          <LoadingCard />
        </div>

        <div v-else-if="favoritesError" class="state-container error">
          <div class="error-box">
            <h3>Oups, quelque chose s'est mal passé</h3>
            <p>{{ favoritesError }}</p>
            <button @click="loadFavorites" class="btn-text-accent">
              Réessayer
            </button>
          </div>
        </div>

        <div
          v-else-if="favoriteProjects.length === 0"
          class="state-container empty"
        >
          <div class="music-note">
            <i class="far fa-heart" />
          </div>
          <h3>Aucun favori</h3>
          <p>Explorez les projets publics et ajoutez-en à vos favoris.</p>
          <BaseButton variant="ghost" @click="activeTab = 'discover'">
            Explorer les projets
          </BaseButton>
        </div>

        <div v-else class="projects-grid">
          <div
            v-for="project in favoriteProjects"
            :key="project.id"
            class="project-card public-card"
            @click="emit('select-public-project', project.id)"
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
                <span class="badge owner-badge">
                  {{ project.owner.firstName }} {{ project.owner.lastName }}
                </span>
                <span class="date">{{ formatDate(project.updatedAt) }}</span>
              </div>
              <h3 class="card-title">{{ project.name }}</h3>
              <div class="card-footer">
                <button
                  class="icon-toggle active favorite-btn"
                  :disabled="togglingFavorite === project.id"
                  @click="toggleFavorite(project.id, $event)"
                  title="Retirer des favoris"
                >
                  <i class="fas fa-heart" />
                </button>
                <div class="open-hint">
                  <span class="click-hint">Ouvrir</span>
                  <i class="fas fa-arrow-right click-hint"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Onglet Découvrir -->
      <template v-else-if="activeTab === 'discover'">
        <div v-if="publicLoading" class="state-container">
          <LoadingCard />
        </div>

        <div v-else-if="publicError" class="state-container error">
          <div class="error-box">
            <h3>Oups, quelque chose s'est mal passé</h3>
            <p>{{ publicError }}</p>
            <button @click="loadPublicProjects" class="btn-text-accent">
              Réessayer
            </button>
          </div>
        </div>

        <div
          v-else-if="publicProjects.length === 0"
          class="state-container empty"
        >
          <div class="music-note">
            <i class="fas fa-globe"></i>
          </div>
          <h3>Aucun projet public</h3>
          <p>
            Soyez le premier à partager un projet ! Rendez l'un de vos projets
            public depuis "Mes projets".
          </p>
        </div>

        <div v-else class="projects-grid">
          <div
            v-for="project in publicProjects"
            :key="project.id"
            class="project-card public-card"
            @click="emit('select-public-project', project.id)"
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
                <span class="badge owner-badge">
                  {{ project.owner.firstName }} {{ project.owner.lastName }}
                </span>
                <span class="date">{{ formatDate(project.updatedAt) }}</span>
              </div>
              <h3 class="card-title">{{ project.name }}</h3>
              <div class="card-footer">
                <button
                  class="icon-toggle favorite-btn"
                  :class="{ active: isProjectFavorited(project.id) }"
                  :disabled="togglingFavorite === project.id"
                  @click="toggleFavorite(project.id, $event)"
                  :title="
                    isProjectFavorited(project.id)
                      ? 'Retirer des favoris'
                      : 'Ajouter aux favoris'
                  "
                >
                  <i
                    :class="
                      isProjectFavorited(project.id)
                        ? 'fas fa-heart'
                        : 'far fa-heart'
                    "
                  />
                </button>
                <div class="open-hint">
                  <span class="click-hint">Ouvrir</span>
                  <i class="fas fa-arrow-right click-hint"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Onglet Corbeille -->
      <template v-else-if="activeTab === 'trash'">
        <div v-if="trashLoading" class="state-container">
          <LoadingCard />
        </div>

        <div v-else-if="trashError" class="state-container error">
          <div class="error-box">
            <h3>Oups, quelque chose s'est mal passé</h3>
            <p>{{ trashError }}</p>
            <button @click="loadTrash" class="btn-text-accent">
              Réessayer
            </button>
          </div>
        </div>

        <div
          v-else-if="trashProjects.length === 0"
          class="state-container empty"
        >
          <div class="music-note"><i class="fas fa-trash" /></div>
          <h3>Corbeille vide</h3>
          <p>Les projets supprimés apparaissent ici pendant 30 jours.</p>
        </div>

        <div v-else class="projects-grid">
          <div
            v-for="project in trashProjects"
            :key="project.id"
            class="project-card trash-card"
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
                <span class="badge days-badge"
                  >J-{{ daysRemaining(project.deletedAt) }}</span
                >
                <span class="date">{{ formatDate(project.updatedAt) }}</span>
              </div>
              <h3 class="card-title">{{ project.name }}</h3>
              <div class="card-footer">
                <BaseButton
                  variant="secondary"
                  size="small"
                  :loading="restoringProject === project.id"
                  :disabled="!!restoringProject"
                  @click="handleRestore(project.id, $event)"
                >
                  <i class="fas fa-undo" /> Restaurer
                </BaseButton>
              </div>
            </div>
          </div>
        </div>
      </template>
    </main>
  </div>

  <BaseModal
    :model-value="!!pendingDeleteId"
    @update:model-value="cancelDelete"
  >
    <h3 class="delete-confirm-title">Supprimer le projet ?</h3>
    <p class="delete-confirm-text">
      Il sera dans la corbeille pendant 30 jours, puis supprimé définitivement.
    </p>
    <template #footer>
      <BaseButton
        variant="secondary"
        :disabled="isDeleting"
        @click="cancelDelete"
      >
        Annuler
      </BaseButton>
      <BaseButton variant="error" :loading="isDeleting" @click="executeDelete">
        Supprimer
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
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

.project-card:hover {
  transform: translateY(-8px);
  border-color: var(--color-accent3-hover);
  box-shadow: var(--shadow-lg);
  background: linear-gradient(
    180deg,
    var(--color-bg-accent3-dark) 0%,
    var(--color-bg-secondary-dark) 100%
  );
}

.public-card:hover {
  border-color: var(--color-accent);
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
  background: var(--color-accent3);
  border-radius: var(--radius-sm);
  animation: wave 1.5s ease-in-out infinite;
  opacity: 0.6;
}

.public-card .waveform span {
  background: var(--color-accent);
}

.project-card:hover .waveform span {
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
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.card-toggles {
  display: flex;
  gap: 8px;
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

.project-card:hover .click-hint {
  opacity: 1;
  transform: translateX(0);
}

.icon-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: transparent;
  border: 1px solid var(--color-border-secondary);
  border-radius: 6px;
  color: var(--color-white-light);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0.5;

  &:hover {
    opacity: 1;
    border-color: var(--color-accent3-hover);
    color: var(--color-white);
  }

  &.active {
    opacity: 1;
    border-color: var(--color-accent3-hover);
    color: var(--color-accent3-hover);
    background: rgba(var(--color-accent3-rgb), 0.2);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.3;
  }
}

.favorite-btn.active {
  border-color: var(--color-danger-hover);
  color: var(--color-danger-hover);
  background: rgba(var(--color-danger-hover-rgb), 0.15);
}

.favorite-btn:hover {
  border-color: var(--color-danger-hover);
  color: var(--color-danger-hover);
}

.state-container {
  text-align: center;
  padding: 60px 20px;
}

.music-note {
  font-size: 4rem;
  margin-bottom: 20px;
  color: var(--color-accent3);
  opacity: 0.5;
}

.state-container h3 {
  color: var(--color-white);
  font-size: 1.5rem;
  margin-bottom: 10px;
}

.state-container p {
  color: var(--color-white-light);
  margin-bottom: 24px;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.btn-text-accent {
  background: none;
  border: none;
  color: var(--color-error-hover);
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  margin-top: 10px;
}

.error-box {
  h3 {
    color: var(--color-white);
    margin-bottom: 8px;
  }
  p {
    color: var(--color-white-light);
    opacity: 0.7;
  }
}

.delete-btn:hover {
  border-color: var(--color-danger-hover);
  color: var(--color-danger-hover);
}

.trash-card {
  cursor: default;
  opacity: 0.75;

  &:hover {
    transform: translateY(-4px);
    border-color: var(--color-border-secondary);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
    background: var(--color-bg-secondary-dark);
  }

  .waveform span {
    background: var(--color-white-light);
    opacity: 0.3;
    animation: none;
  }
}

.days-badge {
  background: rgba(var(--color-danger-hover-rgb), 0.2);
}

.delete-confirm-title {
  color: var(--color-white);
  font-size: 1.25rem;
  margin: 0 0 12px;
}

.delete-confirm-text {
  color: var(--color-white-light);
  opacity: 0.75;
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .projects-grid {
    grid-template-columns: 1fr;
  }
}
</style>
