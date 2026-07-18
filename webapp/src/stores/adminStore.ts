import { defineStore } from "pinia";
import { ref } from "vue";
import apiClient from "../lib/utils/apiClient";

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  profilePicture?: string;
}

interface AdminPack {
  id: string;
  slug: string;
  name: string;
  author: string | null;
  cover: string | null;
  featured: boolean;
  isActive: boolean;
  createdAt: string;
}

interface AdminFolder {
  id: string;
  name: string;
  order: number;
  packId: string;
}

interface AdminSample {
  id: string;
  name: string;
  filename: string;
  duration: number;
  folderId: string;
  previewUrl: string | null;
  fullUrl: string | null;
}

interface AdminProject {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  owner: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface ApiResponse<T> {
  body: T;
}

export const useAdminStore = defineStore("admin", () => {
  // Users state
  const users = ref<AdminUser[]>([]);
  const usersPagination = ref<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const usersLoading = ref(false);

  // Packs state
  const packs = ref<AdminPack[]>([]);
  const packsPagination = ref<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const packsLoading = ref(false);

  // Current pack detail
  const currentPack = ref<AdminPack | null>(null);
  const currentFolders = ref<AdminFolder[]>([]);

  // Current folder detail
  const currentFolder = ref<AdminFolder | null>(null);
  const currentSamples = ref<AdminSample[]>([]);

  // Projects state
  const projects = ref<AdminProject[]>([]);
  const projectsPagination = ref<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const projectsLoading = ref(false);

  // Stats
  const stats = ref({
    totalUsers: 0,
    totalPacks: 0,
    totalSamples: 0,
  });

  // ===== USER ACTIONS =====

  async function fetchUsers(page = 1, search?: string) {
    usersLoading.value = true;
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.append("search", search);

    const result = await apiClient.get<
      ApiResponse<{ users: AdminUser[]; pagination: Pagination }>
    >(`/admin/users?${params}`);

    if (result.data?.body) {
      users.value = result.data.body.users;
      usersPagination.value = result.data.body.pagination;
    }
    usersLoading.value = false;
  }

  async function updateUser(
    id: string,
    data: { role?: string; isActive?: boolean },
  ) {
    const result = await apiClient.patch<ApiResponse<AdminUser>>(
      `/admin/users/${id}`,
      data,
    );
    if (!result.error && result.data?.body) {
      const index = users.value.findIndex((u) => u.id === id);
      if (index >= 0) {
        users.value[index] = result.data.body;
      }
    }
    return result;
  }

  async function deleteUser(id: string) {
    const result = await apiClient.delete<{ message: string }>(
      `/admin/users/${id}`,
    );
    if (!result.error) {
      const index = users.value.findIndex((u) => u.id === id);
      if (index >= 0) {
        users.value[index].isActive = false;
      }
    }
    return result;
  }

  // ===== PACK ACTIONS =====

  async function fetchPacks(page = 1) {
    packsLoading.value = true;
    const result = await apiClient.get<
      ApiResponse<{ packs: AdminPack[]; pagination: Pagination }>
    >(`/admin/samples/packs?page=${page}`);

    if (result.data?.body) {
      packs.value = result.data.body.packs;
      packsPagination.value = result.data.body.pagination;
    }
    packsLoading.value = false;
  }

  async function fetchPackDetail(id: string) {
    const result = await apiClient.get<
      ApiResponse<AdminPack & { folders: AdminFolder[] }>
    >(`/admin/samples/packs/${id}`);

    if (result.data?.body) {
      currentPack.value = result.data.body;
      currentFolders.value = result.data.body.folders || [];
    }
    return result.data?.body || null;
  }

  async function createPack(data: {
    name: string;
    slug: string;
    author?: string;
    cover?: string;
    featured?: boolean;
  }) {
    const result = await apiClient.post<ApiResponse<AdminPack>>(
      "/admin/samples/packs",
      data,
    );
    if (!result.error && result.data?.body) {
      packs.value.unshift(result.data.body);
    }
    return result;
  }

  async function updatePack(id: string, data: Partial<AdminPack>) {
    const result = await apiClient.put<ApiResponse<AdminPack>>(
      `/admin/samples/packs/${id}`,
      data,
    );
    if (!result.error && result.data?.body) {
      const index = packs.value.findIndex((p) => p.id === id);
      if (index >= 0) {
        packs.value[index] = result.data.body;
      }
      if (currentPack.value?.id === id) {
        currentPack.value = result.data.body;
      }
    }
    return result;
  }

  async function deletePack(id: string) {
    const result = await apiClient.delete<{ message: string }>(
      `/admin/samples/packs/${id}`,
    );
    if (!result.error) {
      packs.value = packs.value.filter((p) => p.id !== id);
    }
    return result;
  }

  // ===== FOLDER ACTIONS =====

  async function fetchFolders(packId: string) {
    const result = await apiClient.get<ApiResponse<AdminFolder[]>>(
      `/admin/samples/packs/${packId}/folders`,
    );

    if (result.data?.body) {
      currentFolders.value = result.data.body;
    }
    return result.data?.body || [];
  }

  async function createFolder(
    packId: string,
    data: { name: string; order?: number },
  ) {
    const result = await apiClient.post<ApiResponse<AdminFolder>>(
      `/admin/samples/packs/${packId}/folders`,
      data,
    );
    if (!result.error && result.data?.body) {
      currentFolders.value.push(result.data.body);
    }
    return result;
  }

  async function updateFolder(
    id: string,
    data: { name?: string; order?: number },
  ) {
    const result = await apiClient.put<ApiResponse<AdminFolder>>(
      `/admin/samples/folders/${id}`,
      data,
    );
    if (!result.error && result.data?.body) {
      const index = currentFolders.value.findIndex((f) => f.id === id);
      if (index >= 0) {
        currentFolders.value[index] = result.data.body;
      }
    }
    return result;
  }

  async function deleteFolder(id: string) {
    const result = await apiClient.delete<{ message: string }>(
      `/admin/samples/folders/${id}`,
    );
    if (!result.error) {
      currentFolders.value = currentFolders.value.filter((f) => f.id !== id);
    }
    return result;
  }

  // ===== SAMPLE ACTIONS =====

  async function fetchSamples(folderId: string) {
    const result = await apiClient.get<ApiResponse<AdminSample[]>>(
      `/admin/samples/folders/${folderId}/samples`,
    );

    if (result.data?.body) {
      currentSamples.value = result.data.body;
    }
    return result.data?.body || [];
  }

  async function createSample(
    folderId: string,
    data: {
      name: string;
      filename: string;
      duration?: number;
      previewUrl?: string;
      fullUrl?: string;
    },
  ) {
    const result = await apiClient.post<ApiResponse<AdminSample>>(
      `/admin/samples/folders/${folderId}/samples`,
      data,
    );
    if (!result.error && result.data?.body) {
      currentSamples.value.push(result.data.body);
    }
    return result;
  }

  async function updateSample(id: string, data: Partial<AdminSample>) {
    const result = await apiClient.put<ApiResponse<AdminSample>>(
      `/admin/samples/samples/${id}`,
      data,
    );
    if (!result.error && result.data?.body) {
      const index = currentSamples.value.findIndex((s) => s.id === id);
      if (index >= 0) {
        currentSamples.value[index] = result.data.body;
      }
    }
    return result;
  }

  async function deleteSample(id: string) {
    const result = await apiClient.delete<{ message: string }>(
      `/admin/samples/samples/${id}`,
    );
    if (!result.error) {
      currentSamples.value = currentSamples.value.filter((s) => s.id !== id);
    }
    return result;
  }

  // ===== UPLOAD =====

  async function uploadFile(
    file: File,
    packSlug: string,
    folderName?: string,
  ): Promise<{
    filename: string;
    key: string;
    url: string;
    size: number;
    mimetype: string;
  } | null> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("packSlug", packSlug);
    if (folderName) formData.append("folderName", folderName);

    const result = await apiClient.post<
      ApiResponse<{
        filename: string;
        key: string;
        url: string;
        size: number;
        mimetype: string;
      }>
    >("/admin/upload", formData);

    if (result.error || !result.data?.body) {
      console.error("Upload error:", result.error);
      return null;
    }

    return result.data.body;
  }

  // ===== IMPORT ZIP =====

  interface ImportPackResult {
    success: boolean;
    pack?: {
      id: string;
      name: string;
      slug: string;
      foldersCount: number;
      samplesCount: number;
    };
    warnings?: string[];
    error?: string;
  }

  async function importPackFromZip(
    file: File,
    data: { name: string; slug: string; author?: string },
    onProgress?: (progress: number, stage: "upload" | "processing") => void,
  ): Promise<ImportPackResult> {
    const formData = new FormData();
    formData.append("zipFile", file);
    formData.append("name", data.name);
    formData.append("slug", data.slug);
    if (data.author) formData.append("author", data.author);

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent, "upload");
        }
      });

      xhr.upload.addEventListener("load", () => {
        if (onProgress) {
          onProgress(100, "processing");
        }
      });

      xhr.addEventListener("load", async () => {
        try {
          const result = JSON.parse(xhr.responseText);

          if (xhr.status >= 400) {
            resolve({
              success: false,
              error: result.error || "Import failed",
              warnings: result.warnings,
            });
            return;
          }

          if (result.body?.pack) {
            await fetchPacks();
          }

          resolve({
            success: true,
            pack: result.body.pack,
            warnings: result.body.warnings,
          });
        } catch (error) {
          resolve({
            success: false,
            error: "Failed to parse server response",
          });
        }
      });

      xhr.addEventListener("error", () => {
        resolve({
          success: false,
          error: "Network error during import",
        });
      });

      xhr.open("POST", "/api/admin/import-pack");
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  }

  // ===== PROJECT ACTIONS =====

  async function fetchProjects(page = 1, search?: string) {
    projectsLoading.value = true;
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.append("search", search);

    const result = await apiClient.get<
      ApiResponse<{ projects: AdminProject[]; pagination: Pagination }>
    >(`/admin/projects?${params}`);

    if (result.data?.body) {
      projects.value = result.data.body.projects;
      projectsPagination.value = result.data.body.pagination;
    }
    projectsLoading.value = false;
  }

  function exportProject(id: string) {
    const link = document.createElement("a");
    link.href = `/api/admin/projects/${id}/export`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function importProject(
    file: File,
    ownerId: string,
  ): Promise<{ error: string | null }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("ownerId", ownerId);

    const result = await apiClient.post<ApiResponse<{ id: string }>>(
      "/admin/projects/import",
      formData,
    );

    if (!result.error) {
      await fetchProjects(projectsPagination.value.page);
    }

    return { error: result.error };
  }

  // ===== STATS =====

  async function fetchStats() {
    const result = await apiClient.get<
      ApiResponse<{
        totalUsers: number;
        totalPacks: number;
        totalSamples: number;
      }>
    >("/admin/stats");

    if (result.data?.body) {
      stats.value = result.data.body;
    }
  }

  // ===== RESET =====

  function resetPackDetail() {
    currentPack.value = null;
    currentFolders.value = [];
  }

  function resetFolderDetail() {
    currentFolder.value = null;
    currentSamples.value = [];
  }

  return {
    // State
    users,
    usersPagination,
    usersLoading,
    packs,
    packsPagination,
    packsLoading,
    currentPack,
    currentFolders,
    currentFolder,
    currentSamples,
    projects,
    projectsPagination,
    projectsLoading,
    stats,

    // User actions
    fetchUsers,
    updateUser,
    deleteUser,

    // Pack actions
    fetchPacks,
    fetchPackDetail,
    createPack,
    updatePack,
    deletePack,

    // Folder actions
    fetchFolders,
    createFolder,
    updateFolder,
    deleteFolder,

    // Sample actions
    fetchSamples,
    createSample,
    updateSample,
    deleteSample,

    // Upload
    uploadFile,
    importPackFromZip,

    // Project actions
    fetchProjects,
    exportProject,
    importProject,

    // Stats
    fetchStats,

    // Reset
    resetPackDetail,
    resetFolderDetail,
  };
});
