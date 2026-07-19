<template>
  <AdminLayout>
    <div class="admin-pack-detail">
      <div class="page-header">
        <div class="breadcrumb">
          <router-link :to="{ name: 'admin-samples' }">Samples</router-link>
          <span>/</span>
          <span>{{ currentPack?.name || "Loading..." }}</span>
        </div>
        <BaseButton
          variant="accent2"
          @click="showCreateFolder = true"
          label="New Folder"
          left-icon="fas fa-plus"
        />
      </div>

      <div v-if="!currentPack" class="loading">
        <BaseSpinner />
      </div>

      <template v-else>
        <div class="pack-info-card">
          <div class="pack-cover">
            <img
              v-if="currentPack.cover"
              :src="`/samples/packs/${currentPack.slug}/${currentPack.cover}`"
              :alt="currentPack.name"
            />
            <div v-else class="pack-cover-placeholder">
              {{ currentPack.name.charAt(0).toUpperCase() }}
            </div>
          </div>
          <div class="pack-details">
            <h1>{{ currentPack.name }}</h1>
            <p v-if="currentPack.author" class="author">
              by {{ currentPack.author }}
            </p>
            <div class="pack-meta">
              <span>Slug: {{ currentPack.slug }}</span>
              <BaseBadge v-if="currentPack.featured" variant="featured"
                >Featured</BaseBadge
              >
              <BaseBadge v-if="!currentPack.isActive" variant="inactive"
                >Inactive</BaseBadge
              >
            </div>
          </div>
        </div>

        <h2>Folders ({{ currentFolders.length }})</h2>

        <EmptyState v-if="currentFolders.length === 0" title="No folders yet">
          <template #action>
            <BaseButton
              variant="accent2"
              @click="showCreateFolder = true"
              label="Create first folder"
            />
          </template>
        </EmptyState>

        <div v-else class="folders-list">
          <div
            v-for="folder in currentFolders"
            :key="folder.id"
            class="folder-item"
            @click="openFolder(folder.id)"
          >
            <span class="folder-icon">📁</span>
            <div class="folder-info">
              <span class="folder-name">{{ folder.name }}</span>
              <span class="folder-order">Order: {{ folder.order }}</span>
            </div>
            <div class="folder-actions" @click.stop>
              <BaseButton
                variant="outline"
                size="small"
                @click="editFolder(folder)"
                label="Edit"
              />
              <BaseButton
                variant="danger"
                size="small"
                @click="confirmDeleteFolder(folder)"
                label="Delete"
              />
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Create/Edit Folder Modal -->
    <BaseModal
      :model-value="showCreateFolder || editingFolder !== null"
      @update:model-value="closeModal"
    >
      <template #header>
        <h2>{{ editingFolder ? "Edit Folder" : "Create Folder" }}</h2>
      </template>
      <form id="folder-form" @submit.prevent="submitFolder">
        <FormField label="Name">
          <BaseInput v-model="folderForm.name" required />
        </FormField>
        <FormField label="Order">
          <BaseInput v-model.number="folderForm.order" type="number" min="0" />
        </FormField>
      </form>
      <template #footer>
        <BaseButton variant="outline" @click="closeModal">Cancel</BaseButton>
        <BaseButton
          variant="accent2"
          type="submit"
          form="folder-form"
          :label="editingFolder ? 'Save' : 'Create'"
        />
      </template>
    </BaseModal>

    <!-- Delete confirmation -->
    <BaseModal
      :model-value="pendingDeleteFolder !== null"
      @update:model-value="cancelDeleteFolder"
    >
      <template #header>
        <h2>Delete folder?</h2>
      </template>
      <p>
        Delete folder "{{ pendingDeleteFolder?.name }}"? This will also delete
        all samples in it.
      </p>
      <template #footer>
        <BaseButton
          variant="outline"
          @click="cancelDeleteFolder"
          label="Cancel"
        />
        <BaseButton
          variant="danger"
          @click="executeDeleteFolder"
          label="Delete"
        />
      </template>
    </BaseModal>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import AdminLayout from "../../layouts/AdminLayout.vue";
import { useAdminStore } from "../../stores/adminStore";
import { useToast } from "../../composables/useToast";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseModal from "../../components/ui/BaseModal.vue";
import BaseBadge from "../../components/ui/BaseBadge.vue";
import BaseSpinner from "../../components/ui/BaseSpinner.vue";
import EmptyState from "../../components/ui/EmptyState.vue";
import FormField from "../../components/ui/FormField.vue";
import BaseInput from "../../components/ui/BaseInput.vue";

const route = useRoute();
const router = useRouter();
const adminStore = useAdminStore();
const toast = useToast();

const currentPack = computed(() => adminStore.currentPack);
const currentFolders = computed(() => adminStore.currentFolders);

const showCreateFolder = ref(false);
const editingFolder = ref<any>(null);

const folderForm = reactive({
  name: "",
  order: 0,
});

onMounted(async () => {
  const packId = route.params.packId as string;
  await adminStore.fetchPackDetail(packId);
});

onUnmounted(() => {
  adminStore.resetPackDetail();
});

function openFolder(folderId: string) {
  router.push({
    name: "admin-folder-detail",
    params: { packId: route.params.packId, folderId },
  });
}

function editFolder(folder: any) {
  editingFolder.value = folder;
  folderForm.name = folder.name;
  folderForm.order = folder.order;
}

function closeModal() {
  showCreateFolder.value = false;
  editingFolder.value = null;
  folderForm.name = "";
  folderForm.order = currentFolders.value.length;
}

async function submitFolder() {
  const packId = route.params.packId as string;

  const result = editingFolder.value
    ? await adminStore.updateFolder(editingFolder.value.id, {
        name: folderForm.name,
        order: folderForm.order,
      })
    : await adminStore.createFolder(packId, {
        name: folderForm.name,
        order: folderForm.order,
      });

  if (result.error) {
    toast.error(`Erreur lors de l'enregistrement du dossier.`);
  } else {
    toast.success(`Dossier "${folderForm.name}" enregistré.`);
  }
  closeModal();
}

const pendingDeleteFolder = ref<any>(null);

function confirmDeleteFolder(folder: any) {
  pendingDeleteFolder.value = folder;
}

function cancelDeleteFolder() {
  pendingDeleteFolder.value = null;
}

async function executeDeleteFolder() {
  if (!pendingDeleteFolder.value) return;
  const folder = pendingDeleteFolder.value;
  const result = await adminStore.deleteFolder(folder.id);
  if (result.error) {
    toast.error(`Erreur lors de la suppression de "${folder.name}".`);
  } else {
    toast.success(`Dossier "${folder.name}" supprimé.`);
  }
  pendingDeleteFolder.value = null;
}
</script>

<style scoped lang="scss">
.admin-pack-detail {
  h1 {
    margin: 0 0 4px;
    font-size: 24px;
    font-weight: 600;
    color: var(--color-white);
  }

  h2 {
    margin: 24px 0 16px;
    font-size: 18px;
    font-weight: 500;
    color: var(--color-white);
  }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;

  a {
    color: var(--color-accent2);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  span {
    color: rgba(255, 255, 255, 0.5);
  }
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.pack-info-card {
  display: flex;
  gap: 20px;
  background: var(--color-bg-surface-deep);
  border-radius: var(--radius-lg);
  padding: 20px;
  border: 1px solid rgba(122, 15, 62, 0.3);
}

.pack-cover {
  width: 100px;
  height: 100px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: linear-gradient(
    135deg,
    var(--color-accent2) 0%,
    var(--color-accent3) 100%
  );
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.pack-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: 700;
  color: var(--color-white);
}

.pack-details {
  flex: 1;
}

.author {
  margin: 0 0 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.pack-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.folders-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--color-bg-surface-deep);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid rgba(122, 15, 62, 0.3);

  &:hover {
    background: rgba(122, 15, 62, 0.3);
    border-color: rgba(255, 63, 180, 0.5);
  }
}

.folder-icon {
  font-size: 24px;
}

.folder-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.folder-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-white);
}

.folder-order {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.folder-actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 480px) {
  .pack-info-card {
    flex-direction: column;
  }

  .pack-cover {
    width: 100%;
    height: 140px;
  }
}
</style>
