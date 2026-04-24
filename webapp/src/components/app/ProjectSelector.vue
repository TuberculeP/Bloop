<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useProjectStore } from "../../stores/projectStore";

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

const emit = defineEmits<{
  (e: "new-project"): void;
  (e: "select-project", projectId: string): void;
}>();

const projectStore = useProjectStore();
const projects = ref<Project[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const loadProjects = async () => {
  loading.value = true;
  error.value = null;

  const result = await projectStore.getProjects();

  if (result.success && result.data) {
    projects.value = result.data;
  } else {
    error.value = result.error || "Erreur lors du chargement";
  }

  loading.value = false;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const createNewProject = () => {
  emit("new-project");
};

const selectProject = (projectId: string) => {
  emit("select-project", projectId);
};


onMounted(() => {
  loadProjects();
});
</script>

<template>
  <div class="project-selector">
    <div class="selector-header">
      <h1>Bloop Sequencer</h1>
      <p class="subtitle">Créez et gérez vos compositions musicales</p>
    </div>

    <div class="selector-content">
      <button class="btn-new-project" @click="createNewProject">
        <span class="btn-icon">+</span>
        <span class="btn-text">Nouveau projet</span>
      </button>

      <div class="projects-section">
        <h2>Mes projets</h2>

        <div v-if="loading" class="loading-state">
          <span class="loader"></span>
          Chargement des projets...
        </div>

        <div v-else-if="error" class="error-state">
          {{ error }}
          <button class="btn-retry" @click="loadProjects">Réessayer</button>
        </div>

        <div v-else-if="projects.length === 0" class="empty-state">
          <p>Aucun projet sauvegardé</p>
          <p class="hint">Créez votre premier projet pour commencer</p>
        </div>

        <div v-else class="projects-list">
          <div
            v-for="project in projects"
            :key="project.id"
            class="project-card"
            @click="selectProject(project.id)"
          >
            <div class="project-info">
              <span class="project-name">{{ project.name }}</span>
              <span class="project-date">{{
                formatDate(project.updatedAt)
              }}</span>
            </div>
            <div class="project-actions"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-selector {
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 20px;
}

.selector-header {
  text-align: center;
  margin-bottom: 40px;
}

.selector-header h1 {
  font-size: 2.5rem;
  color: var(--color-white);
  margin-bottom: 8px;
}

.subtitle {
  color: var(--color-text-secondary);
  font-size: 1rem;
}

.selector-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.btn-new-project {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 20px;
  background: var(--color-primary);
  border: 2px solid var(--color-primary);
  border-radius: 12px;
  color: var(--color-white);
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-new-project:hover {
  background: var(--color-primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.btn-icon {
  font-size: 1.5rem;
  font-weight: 300;
}

.projects-section h2 {
  color: var(--color-white);
  font-size: 1.2rem;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border-secondary);
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 32px;
  color: var(--color-text-secondary);
  background: var(--color-bg-primary-dark);
  border-radius: 8px;
}

.loader {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-text-secondary);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-state {
  color: var(--color-error, #ef4444);
}

.btn-retry {
  margin-top: 12px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--color-border-secondary);
  border-radius: 6px;
  color: var(--color-white);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-retry:hover {
  background: var(--color-bg-secondary);
}

.empty-state .hint {
  font-size: 0.9rem;
  margin-top: 8px;
  opacity: 0.7;
}

.projects-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.project-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--color-bg-primary-dark);
  border: 1px solid var(--color-border-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.project-card:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-primary);
  transform: translateX(4px);
}

.project-card:hover .project-name,
.project-card:hover .project-date {
  color: var(--color-bg-primary-dark);
}

.project-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.project-name {
  color: var(--color-white);
  font-weight: 500;
  font-size: 1rem;
}

.project-date {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

.project-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-download {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: 1px solid var(--color-border-secondary);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  padding: 0;
  overflow: hidden;
}

.btn-download img {
  width: 18px;
  height: 18px;
  filter: invert(1) opacity(0.6);
  transition: all 0.2s ease;
}

.project-card:hover .btn-download img {
  filter: brightness(0) opacity(0.7);
}

.btn-download:hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.btn-download:hover img {
  filter: invert(1) opacity(1) !important;
}
</style>
