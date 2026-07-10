<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import AppLayout from "../../layouts/AppLayout.vue";
import ProjectSelector from "../../components/app/ProjectSelector.vue";
import { useMainStore } from "../../stores/mainStore";
import { useOnboardingStore } from "../../stores/onboardingStore";
import { storeToRefs } from "pinia";

const router = useRouter();
const mainStore = useMainStore();
const onboardingStore = useOnboardingStore();
const { isLoaded, loadPercentage } = storeToRefs(mainStore);
const { loadAll } = mainStore;

// Pré-charger l'audio dès l'arrivée sur /app (first click requirement)
onMounted(() => {
  if (!isLoaded.value) {
    loadAll();
  }
  if (!onboardingStore.hasSeen()) {
    onboardingStore.markSeen();
    onboardingStore.start();
  }
});

const handleNewProject = () => {
  router.push({ name: "app-sequencer", query: { new: "true" } });
};

const handleSelectProject = (projectId: string) => {
  router.push({ name: "app-sequencer", query: { projectId } });
};

const handleSelectPublicProject = (projectId: string) => {
  router.push({
    name: "app-sequencer",
    query: { projectId, readOnly: "true" },
  });
};
</script>

<template>
  <AppLayout>
    <!-- Écran de chargement audio -->
    <div v-if="!isLoaded" class="loading-screen">
      <p>Chargement de l'application... {{ loadPercentage }}%</p>
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: `${loadPercentage}%` }"
        ></div>
      </div>
    </div>

    <!-- Sélecteur de projet (affiché une fois l'audio chargé) -->
    <ProjectSelector
      v-else
      @new-project="handleNewProject"
      @select-project="handleSelectProject"
      @select-public-project="handleSelectPublicProject"
    />
  </AppLayout>
</template>

<style scoped>
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
