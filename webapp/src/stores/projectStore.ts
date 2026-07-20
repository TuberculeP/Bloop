import { defineStore } from "pinia";
import { ref } from "vue";
import apiClient from "../lib/utils/apiClient";
import type {
  TimelineProject,
  PublicProjectListItem,
  FavoriteProjectListItem,
  TrashedProjectListItem,
} from "../lib/utils/types";
import type { useTimelineStore } from "./timelineStore";

const stripTimestamps = (obj: any): any => {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      key === "updatedAt" || key === "createdAt" ? undefined : value,
    ),
  );
};

export const useProjectStore = defineStore("project", () => {
  const isSaving = ref(false);
  const isLoading = ref(false);
  const currentProjectId = ref<string | null>(null);
  const hasUnsavedChanges = ref(false);
  const lastSavedState = ref<string | null>(null);
  const isReadOnly = ref(false);
  const currentProjectOwner = ref<{
    id: string;
    firstName: string;
    lastName: string;
  } | null>(null);
  const lastSavedAt = ref<number | null>(null);
  const lastExportedAt = ref<number | null>(null);
  const lastPlaybackLoopedAt = ref<number | null>(null);

  const saveProjectOnline = async (
    project: TimelineProject,
  ): Promise<{ success: boolean; error?: string; projectId?: string }> => {
    if (isReadOnly.value) {
      return { success: false, error: "Projet en lecture seule" };
    }

    if (isSaving.value) {
      return { success: false, error: "Sauvegarde déjà en cours" };
    }

    isSaving.value = true;

    try {
      const projectData = {
        version: "5.0",
        format: "timeline-v3",
        data: project,
      };

      let result;
      let isUpdate = false;

      if (currentProjectId.value) {
        isUpdate = true;
        result = await apiClient.put<{ body: any }>(
          `/app/projects/${currentProjectId.value}`,
          {
            name: project.name,
            description: "Projet créé avec Bloop DAW",
            data: projectData,
          },
        );
      } else {
        result = await apiClient.post<{ body: any }>("/app/projects", {
          name: project.name,
          description: "Projet créé avec Bloop DAW",
          data: projectData,
        });
      }

      const { data, error } = result;

      if (error) {
        throw new Error(error);
      }

      if (!isUpdate && data?.body?.id) {
        currentProjectId.value = data.body.id;
      }

      hasUnsavedChanges.value = false;
      lastSavedState.value = JSON.stringify(stripTimestamps(project));
      lastSavedAt.value = Date.now();

      return {
        success: true,
        projectId: currentProjectId.value || undefined,
      };
    } catch {
      return {
        success: false,
        error:
          "Erreur lors de la sauvegarde en ligne. Vérifiez votre connexion.",
      };
    } finally {
      isSaving.value = false;
    }
  };

  const getProjects = async () => {
    try {
      const { data, error } = await apiClient.get<{ body: any[] }>(
        "/app/projects",
      );

      if (error) {
        throw new Error(error);
      }

      return { success: true, data: data?.body || [] };
    } catch {
      return {
        success: false,
        error: "Erreur lors de la récupération des projets.",
      };
    }
  };

  const getProject = async (id: string) => {
    try {
      const { data, error } = await apiClient.get<{ body: any }>(
        `/app/projects/${id}`,
      );

      if (error) {
        throw new Error(error);
      }

      return { success: true, data: data?.body };
    } catch {
      return {
        success: false,
        error: "Erreur lors de la récupération du projet.",
      };
    }
  };

  const getPublicProjects = async (): Promise<{
    success: boolean;
    data?: PublicProjectListItem[];
    error?: string;
  }> => {
    try {
      const { data, error } = await apiClient.get<{
        body: PublicProjectListItem[];
      }>("/app/projects/public");

      if (error) {
        throw new Error(error);
      }

      return { success: true, data: data?.body || [] };
    } catch {
      return {
        success: false,
        error: "Erreur lors de la récupération des projets publics.",
      };
    }
  };

  const getFavoriteProjects = async (): Promise<{
    success: boolean;
    data?: FavoriteProjectListItem[];
    error?: string;
  }> => {
    try {
      const { data, error } = await apiClient.get<{
        body: FavoriteProjectListItem[];
      }>("/app/projects/favorites");

      if (error) {
        throw new Error(error);
      }

      return { success: true, data: data?.body || [] };
    } catch {
      return {
        success: false,
        error: "Erreur lors de la récupération des favoris.",
      };
    }
  };

  const cloneProject = async (
    sourceId: string,
  ): Promise<{ success: boolean; projectId?: string; error?: string }> => {
    try {
      const { data, error } = await apiClient.post<{
        body: { id: string; name: string };
      }>(`/app/projects/${sourceId}/clone`);

      if (error) {
        throw new Error(error);
      }

      return { success: true, projectId: data?.body?.id };
    } catch {
      return {
        success: false,
        error: "Erreur lors du clonage du projet.",
      };
    }
  };

  const addFavorite = async (
    projectId: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await apiClient.post(
        `/app/projects/${projectId}/favorite`,
      );

      if (error) {
        throw new Error(error);
      }

      return { success: true };
    } catch {
      return { success: false, error: "Erreur lors de l'ajout aux favoris." };
    }
  };

  const removeFavorite = async (
    projectId: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await apiClient.delete(
        `/app/projects/${projectId}/favorite`,
      );

      if (error) {
        throw new Error(error);
      }

      return { success: true };
    } catch {
      return {
        success: false,
        error: "Erreur lors de la suppression du favori.",
      };
    }
  };

  const deleteProject = async (
    id: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await apiClient.delete(`/app/projects/${id}`);

      if (error) {
        throw new Error(error);
      }

      if (currentProjectId.value === id) resetProject();

      return { success: true };
    } catch {
      return {
        success: false,
        error: "Erreur lors de la suppression du projet.",
      };
    }
  };

  const getTrashedProjects = async (): Promise<{
    success: boolean;
    data?: TrashedProjectListItem[];
    error?: string;
  }> => {
    try {
      const { data, error } = await apiClient.get<{
        body: TrashedProjectListItem[];
      }>("/app/projects/trash");

      if (error) {
        throw new Error(error);
      }

      return { success: true, data: data?.body || [] };
    } catch {
      return {
        success: false,
        error: "Erreur lors de la récupération de la corbeille.",
      };
    }
  };

  const restoreProject = async (
    id: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await apiClient.patch(`/app/projects/${id}/restore`);

      if (error) {
        throw new Error(error);
      }

      return { success: true };
    } catch {
      return {
        success: false,
        error: "Erreur lors de la restauration du projet.",
      };
    }
  };

  const loadProjectToTimeline = async (
    projectId: string,
    timelineStore: ReturnType<typeof useTimelineStore>,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      isLoading.value = true;
      const result = await getProject(projectId);

      if (result.success && result.data) {
        const projectWrapper = result.data.data;

        const isCompatibleFormat =
          projectWrapper?.format === "timeline-v3" ||
          projectWrapper?.format === "timeline-v2";
        if (isCompatibleFormat && projectWrapper?.data) {
          const timelineData = projectWrapper.data as TimelineProject;
          timelineStore.loadProjectData(timelineData);
          currentProjectId.value = projectId;
          hasUnsavedChanges.value = false;
          lastSavedState.value = JSON.stringify(stripTimestamps(timelineData));

          isReadOnly.value = result.data.isOwned === false;
          currentProjectOwner.value = result.data.owner ?? null;

          isLoading.value = false;
          return { success: true };
        }

        isLoading.value = false;
        return {
          success: false,
          error: "Format de projet non compatible (attendu: timeline-v3)",
        };
      }

      isLoading.value = false;
      return {
        success: false,
        error: result.error || "Projet non trouvé",
      };
    } catch {
      isLoading.value = false;
      return {
        success: false,
        error: "Erreur lors du chargement du projet.",
      };
    }
  };

  const resetProject = () => {
    currentProjectId.value = null;
    hasUnsavedChanges.value = false;
    lastSavedState.value = null;
    isReadOnly.value = false;
    currentProjectOwner.value = null;
  };

  const markAsChanged = () => {
    hasUnsavedChanges.value = true;
  };

  const markAsSaved = (project: TimelineProject) => {
    hasUnsavedChanges.value = false;
    lastSavedState.value = JSON.stringify(stripTimestamps(project));
  };

  const setCurrentProjectId = (id: string | null) => {
    currentProjectId.value = id;
  };

  const markExportSuccess = () => {
    lastExportedAt.value = Date.now();
  };

  const markPlaybackLooped = () => {
    lastPlaybackLoopedAt.value = Date.now();
  };

  return {
    isSaving,
    isLoading,
    currentProjectId,
    hasUnsavedChanges,
    isReadOnly,
    currentProjectOwner,
    lastSavedAt,
    lastExportedAt,
    lastPlaybackLoopedAt,
    saveProjectOnline,
    markExportSuccess,
    markPlaybackLooped,
    getProjects,
    getProject,
    getPublicProjects,
    getFavoriteProjects,
    cloneProject,
    addFavorite,
    removeFavorite,
    deleteProject,
    getTrashedProjects,
    restoreProject,
    loadProjectToTimeline,
    resetProject,
    markAsChanged,
    markAsSaved,
    setCurrentProjectId,
  };
});
