<script setup lang="ts">
import { useMainStore } from "../../stores/mainStore";
import { storeToRefs } from "pinia";
import { TimelineView } from "../../components/app/timeline";
import AudioLibraryPanel from "../../components/app/timeline/AudioLibraryPanel.vue";
import DawLoadingOverlay from "../../components/app/DawLoadingOverlay.vue";
import { computed, onMounted, ref, provide } from "vue";
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

const loadError = ref<string | null>(null);
const showAudioLibrary = ref(false);

// Provide sidebar state to children
provide("showAudioLibrary", showAudioLibrary);

const mainStore = useMainStore();
const { isLoaded, loadPercentage } = storeToRefs(mainStore);

onMounted(async () => {
  if (!isLoaded.value) {
    router.replace({ name: "app-main" });
    return;
  }

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

  // Précharger les ressources du projet
  await dawLoadingStore.preloadProject(timelineStore.project);
});

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
  <div class="sequencer-layout">
    <DawLoadingOverlay />
    <div class="app-container">
      <div v-if="!isLoaded" class="loading-screen">
        <p>Chargement de l'application... {{ loadPercentage }}%</p>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${loadPercentage}%` }"
          ></div>
        </div>
      </div>

      <div v-else class="main-layout">
        <aside v-if="showAudioLibrary" class="sidebar-left">
          <AudioLibraryPanel />
        </aside>
        <div class="content-area">
          <TimelineView />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sequencer-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

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
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 4px;
  transition: width 0.3s ease;
}
</style>
