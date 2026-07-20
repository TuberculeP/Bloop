<script setup lang="ts">
import { useMainStore } from "../../stores/mainStore";
import { storeToRefs } from "pinia";
import AppLayout from "../../layouts/AppLayout.vue";
import { TimelineView } from "../../components/app/timeline";
import AudioLibraryPanel from "../../components/app/timeline/AudioLibraryPanel.vue";
import DawLoadingOverlay from "../../components/app/DawLoadingOverlay.vue";
import ProjectWelcomeGate from "../../components/app/ProjectWelcomeGate.vue";
import { computed, onMounted, ref, provide, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTimelineStore } from "../../stores/timelineStore";
import { useTrackAudioStore } from "../../stores/trackAudioStore";
import { useProjectStore } from "../../stores/projectStore";
import { useDawLoadingStore } from "../../stores/dawLoadingStore";

const route = useRoute();
const router = useRouter();
const timelineStore = useTimelineStore();
const trackAudioStore = useTrackAudioStore();
const projectStore = useProjectStore();
const dawLoadingStore = useDawLoadingStore();

const isNewProject = computed(() => route.query.new === "true");
const projectIdFromUrl = computed(
  () => route.query.projectId as string | undefined,
);
const isExportMode = computed(() => route.query.export === "true");

const loadError = ref<string | null>(null);
const showAudioLibrary = ref(false);

const showWelcomeGate = ref(false);
const gateProjectName = ref("");
const gateOwnerName = ref<string | undefined>(undefined);
const gateLoading = ref(false);

provide("showAudioLibrary", showAudioLibrary);

const mainStore = useMainStore();
const { isLoaded, loadPercentage } = storeToRefs(mainStore);

const initProject = async () => {
  loadError.value = null;
  dawLoadingStore.reset();

  if (isNewProject.value) {
    projectStore.resetProject();
    timelineStore.createNewProject("Nouveau Projet");
  } else if (projectIdFromUrl.value) {
    const result = await projectStore.loadProjectToTimeline(
      projectIdFromUrl.value,
      timelineStore,
    );
    if (!result.success) {
      loadError.value = result.error || "Erreur lors du chargement";
      projectStore.resetProject();
      timelineStore.createNewProject("Nouveau Projet");
    }
  } else {
    projectStore.resetProject();
    timelineStore.initialize();
  }

  trackAudioStore.initialize();
  await dawLoadingStore.preloadProject(timelineStore.project);
};

// Déclenché quand l'audio finit de charger (après clic sur le gate ou accès direct sans projet)
watch(
  isLoaded,
  async (loaded) => {
    if (loaded) {
      showWelcomeGate.value = false;
      await initProject();
    }
  },
  { once: true },
);

onMounted(async () => {
  // Flux normal : audio déjà chargé (navigation depuis le sélecteur)
  if (isLoaded.value) {
    initProject();
    return;
  }

  // Accès direct par lien avec un projectId : afficher le gate
  if (projectIdFromUrl.value) {
    const result = await projectStore.getProject(projectIdFromUrl.value);
    if (result.success && result.data) {
      gateProjectName.value = result.data.name ?? "Projet";
      const owner = result.data.owner;
      if (owner && result.data.isOwned === false) {
        gateOwnerName.value = `${owner.firstName} ${owner.lastName}`;
      }
    } else {
      gateProjectName.value = "Projet";
    }
    showWelcomeGate.value = true;
    return;
  }

  // Accès direct sans projectId : lancer le chargement direct
  mainStore.loadAll();
});

const handleGateLoad = () => {
  gateLoading.value = true;
  mainStore.loadAll();
  // Le watcher sur isLoaded masquera le gate et appelera initProject() une fois prêt
};

const handleSave = async () => {
  const result = await projectStore.saveProjectOnline(timelineStore.project);
  if (result.success && result.projectId) {
    router.replace({
      name: "app-sequencer",
      query: { projectId: result.projectId },
    });
  }
  return result;
};

const handleBackToProjects = () => {
  router.push({ name: "app-main" });
};

const toggleAudioLibrary = () => {
  showAudioLibrary.value = !showAudioLibrary.value;
};

defineExpose({
  handleSave,
  handleBackToProjects,
  toggleAudioLibrary,
});
</script>

<template>
  <AppLayout>
    <ProjectWelcomeGate
      v-if="showWelcomeGate"
      :project-name="gateProjectName"
      :owner-name="gateOwnerName"
      :loading="gateLoading"
      @load="handleGateLoad"
    />

    <DawLoadingOverlay v-if="!showWelcomeGate" />
    <div class="app-container">
      <div v-if="!isLoaded && !showWelcomeGate" class="loading-screen">
        <p>Chargement de l'application... {{ loadPercentage }}%</p>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${loadPercentage}%` }"
          ></div>
        </div>
      </div>

      <div v-else-if="isLoaded" class="main-layout">
        <aside v-if="showAudioLibrary" class="sidebar-left">
          <AudioLibraryPanel />
        </aside>
        <div class="content-area">
          <TimelineView :export-mode="isExportMode" />
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.app-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.main-layout {
  flex: 1;
  display: flex;
  min-height: 0;
}

.sidebar-left {
  flex-shrink: 0;
  border-right: 1px solid rgba(122, 15, 62, 0.5);
  overflow: hidden;
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.loading-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 20px;
  color: var(--color-text-secondary);
}

.progress-bar {
  width: 300px;
  height: 8px;
  background: var(--color-bg-primary-dark);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: var(--radius-sm);
  transition: width 0.3s ease;
}
</style>
