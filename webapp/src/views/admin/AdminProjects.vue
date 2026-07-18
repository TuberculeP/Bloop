<template>
  <AdminLayout>
    <div class="admin-projects">
      <div class="page-header">
        <h1>Projects</h1>
        <div class="header-actions">
          <BaseInput
            v-model="searchQuery"
            @input="debouncedSearch"
            placeholder="Search by project name or owner email..."
            class="search-input"
          />
          <BaseButton variant="primary" @click="openImportModal">
            Import project
          </BaseButton>
        </div>
      </div>

      <div v-if="projectsLoading" class="loading">
        <BaseSpinner />
      </div>

      <div v-else class="projects-table-container">
        <table class="projects-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Owner</th>
              <th>Visibility</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="project in projects" :key="project.id">
              <td>{{ project.name }}</td>
              <td>{{ project.owner.email }}</td>
              <td>
                <BaseBadge :variant="project.isPublic ? 'featured' : 'neutral'">
                  {{ project.isPublic ? "Public" : "Private" }}
                </BaseBadge>
              </td>
              <td>{{ formatDate(project.updatedAt) }}</td>
              <td>
                <BaseButton
                  variant="outline"
                  size="small"
                  @click="adminStore.exportProject(project.id)"
                >
                  Export
                </BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <BasePagination
        :page="projectsPagination.page"
        :pages="projectsPagination.pages"
        @update:page="goToPage"
      />
    </div>

    <BaseModal v-model="isImportModalOpen">
      <template #header>
        <h2>Import project</h2>
      </template>

      <form @submit.prevent="submitImport" class="import-form">
        <FormField label="Export file (.json)">
          <input
            ref="fileInput"
            type="file"
            accept="application/json"
            @change="handleFileSelect"
            class="file-input"
          />
        </FormField>

        <FormField label="Assign to owner">
          <BaseInput
            v-model="ownerSearchQuery"
            @input="debouncedOwnerSearch"
            placeholder="Search user by email or name..."
          />
          <BaseSelect
            v-model="selectedOwnerId"
            :options="ownerOptions"
            :disabled="ownerOptions.length === 0"
          />
        </FormField>
      </form>

      <template #footer>
        <BaseButton variant="outline" @click="closeImportModal">
          Cancel
        </BaseButton>
        <BaseButton
          variant="primary"
          :disabled="!importFile || !selectedOwnerId || isImporting"
          @click="submitImport"
        >
          {{ isImporting ? "Importing..." : "Import" }}
        </BaseButton>
      </template>
    </BaseModal>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import AdminLayout from "../../layouts/AdminLayout.vue";
import { useAdminStore } from "../../stores/adminStore";
import { useToast } from "../../composables/useToast";
import { useDebouncedCallback } from "../../composables/useDebouncedCallback";
import BaseInput from "../../components/ui/BaseInput.vue";
import BaseSelect from "../../components/ui/BaseSelect.vue";
import BaseBadge from "../../components/ui/BaseBadge.vue";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseSpinner from "../../components/ui/BaseSpinner.vue";
import BaseModal from "../../components/ui/BaseModal.vue";
import BasePagination from "../../components/ui/BasePagination.vue";
import FormField from "../../components/ui/FormField.vue";

const adminStore = useAdminStore();
const toast = useToast();
const searchQuery = ref("");

const projects = computed(() => adminStore.projects);
const projectsPagination = computed(() => adminStore.projectsPagination);
const projectsLoading = computed(() => adminStore.projectsLoading);

onMounted(() => {
  adminStore.fetchProjects();
});

const debouncedSearch = useDebouncedCallback(() => {
  adminStore.fetchProjects(1, searchQuery.value || undefined);
});

function goToPage(page: number) {
  adminStore.fetchProjects(page, searchQuery.value || undefined);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString();
}

// ===== Import modal =====

const isImportModalOpen = ref(false);
const importFile = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const isImporting = ref(false);

const ownerSearchQuery = ref("");
const selectedOwnerId = ref("");
const ownerOptions = computed(() =>
  adminStore.users.map((u) => ({
    value: u.id,
    label: `${u.firstName} ${u.lastName} (${u.email})`,
  })),
);

function openImportModal() {
  importFile.value = null;
  selectedOwnerId.value = "";
  ownerSearchQuery.value = "";
  isImportModalOpen.value = true;
}

function closeImportModal() {
  isImportModalOpen.value = false;
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  importFile.value = target.files?.[0] || null;
}

const debouncedOwnerSearch = useDebouncedCallback(() => {
  adminStore.fetchUsers(1, ownerSearchQuery.value || undefined);
});

async function submitImport() {
  if (!importFile.value || !selectedOwnerId.value) return;

  isImporting.value = true;
  const result = await adminStore.importProject(
    importFile.value,
    selectedOwnerId.value,
  );
  isImporting.value = false;

  if (result.error) {
    toast.error("Erreur lors de l'import du projet.");
  } else {
    toast.success("Projet importé avec succès.");
    closeImportModal();
  }
}
</script>

<style scoped lang="scss">
.admin-projects {
  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: var(--color-white);
  }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.page-header .search-input {
  width: 300px;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.projects-table-container {
  overflow-x: auto;
}

.projects-table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  background: var(--color-bg-surface-deep);
  border-radius: var(--radius-lg);
  overflow: hidden;

  th,
  td {
    padding: 14px 16px;
    text-align: left;
  }

  th {
    background: rgba(122, 15, 62, 0.3);
    color: rgba(255, 255, 255, 0.8);
    font-weight: 500;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  td {
    color: var(--color-white);
    border-top: 1px solid rgba(122, 15, 62, 0.2);
  }

  tbody tr:hover {
    background: rgba(122, 15, 62, 0.15);
  }
}

.import-form {
  display: flex;
  flex-direction: column;
}

.file-input {
  color: var(--color-white);
  font-size: 0.9rem;
}

@media (max-width: 480px) {
  .page-header .search-input {
    width: 100%;
  }
}
</style>
