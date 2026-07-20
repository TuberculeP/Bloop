import { ref, watch, type Ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useProjectStore } from "../../stores/projectStore";
import { useTimelineStore } from "../../stores/timelineStore";
import { useDawLoadingStore } from "../../stores/dawLoadingStore";

/** Métadonnées de projet : nom, sauvegarde, clonage, rechargement (route + lecture seule). */
export function useTimelineProjectMeta() {
  const router = useRouter();
  const route = useRoute();
  const projectStore = useProjectStore();
  const timelineStore = useTimelineStore();
  const dawLoadingStore = useDawLoadingStore();

  const isCloning = ref(false);
  const isSaving = ref(false);
  const saveMessage = ref<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  const isEditingProjectName = ref(false);
  const editedProjectName = ref("");
  const projectNameInputRef: Ref<HTMLInputElement | null> = ref(null);

  watch(
    () => route.query.projectId,
    async (newId) => {
      if (
        newId &&
        typeof newId === "string" &&
        newId !== timelineStore.project.id
      ) {
        await projectStore.loadProjectToTimeline(newId, timelineStore);
        await dawLoadingStore.preloadProject(timelineStore.project);
      }
    },
  );

  const startEditProjectName = () => {
    editedProjectName.value = timelineStore.project.name;
    isEditingProjectName.value = true;
    setTimeout(() => projectNameInputRef.value?.select(), 0);
  };

  const saveProjectName = () => {
    const trimmed = editedProjectName.value.trim();
    if (trimmed && trimmed !== timelineStore.project.name) {
      timelineStore.renameProject(trimmed);
    }
    isEditingProjectName.value = false;
  };

  const cancelEditProjectName = () => {
    isEditingProjectName.value = false;
  };

  const handleSaveProject = async () => {
    if (isSaving.value) return;

    isSaving.value = true;
    saveMessage.value = null;

    try {
      const result = await projectStore.saveProjectOnline(
        timelineStore.project,
      );

      if (result.success && result.projectId) {
        saveMessage.value = { type: "success", text: "Projet sauvegardé" };
        router.replace({
          name: "app-sequencer",
          query: { projectId: result.projectId },
        });
      } else {
        saveMessage.value = {
          type: "error",
          text: result.error || "Erreur de sauvegarde",
        };
      }
    } catch {
      saveMessage.value = { type: "error", text: "Erreur de sauvegarde" };
    } finally {
      isSaving.value = false;
      setTimeout(() => {
        saveMessage.value = null;
      }, 3000);
    }
  };

  const handleBackToProjects = () => {
    router.push({ name: "app-main" });
  };

  const handleResetReadOnly = async () => {
    if (!projectStore.currentProjectId) return;
    await projectStore.loadProjectToTimeline(
      projectStore.currentProjectId,
      timelineStore,
    );
    await dawLoadingStore.preloadProject(timelineStore.project);
  };

  const handleCloneProject = async () => {
    if (!projectStore.currentProjectId || isCloning.value) return;
    isCloning.value = true;
    const result = await projectStore.cloneProject(
      projectStore.currentProjectId,
    );
    isCloning.value = false;
    if (result.success && result.projectId) {
      router.replace({
        name: "app-sequencer",
        query: { projectId: result.projectId },
      });
    }
  };

  return {
    isCloning,
    isSaving,
    saveMessage,
    isEditingProjectName,
    editedProjectName,
    projectNameInputRef,
    startEditProjectName,
    saveProjectName,
    cancelEditProjectName,
    handleSaveProject,
    handleBackToProjects,
    handleResetReadOnly,
    handleCloneProject,
  };
}
