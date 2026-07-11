<template>
  <AdminLayout>
    <div class="admin-folder-detail">
      <div class="page-header">
        <div class="breadcrumb">
          <router-link :to="{ name: 'admin-samples' }">Samples</router-link>
          <span>/</span>
          <router-link
            :to="{
              name: 'admin-pack-detail',
              params: { packId: route.params.packId },
            }"
          >
            {{ currentPack?.name || "..." }}
          </router-link>
          <span>/</span>
          <span>{{ currentFolder?.name || "Loading..." }}</span>
        </div>
      </div>

      <div v-if="!currentFolder" class="loading">
        <BaseSpinner />
      </div>

      <template v-else>
        <div class="folder-info-card">
          <span class="folder-icon">📁</span>
          <div class="folder-details">
            <h1>{{ currentFolder.name }}</h1>
            <span class="folder-meta">{{ currentSamples.length }} samples</span>
          </div>
        </div>

        <h2>Samples ({{ currentSamples.length }})</h2>

        <EmptyState
          v-if="currentSamples.length === 0"
          title="No samples in this folder."
        />

        <div v-else class="samples-list">
          <div
            v-for="sample in currentSamples"
            :key="sample.id"
            class="sample-item"
          >
            <span class="sample-icon">🔊</span>
            <div class="sample-info">
              <span class="sample-name">{{ sample.name }}</span>
              <span class="sample-meta">
                {{ sample.filename }}
                <span v-if="sample.duration > 0">
                  · {{ formatDuration(sample.duration) }}
                </span>
              </span>
            </div>
            <div class="sample-actions">
              <BaseButton
                variant="outline"
                size="small"
                @click="editSample(sample)"
              >
                Edit
              </BaseButton>
              <BaseButton
                variant="danger"
                size="small"
                @click="confirmDeleteSample(sample)"
              >
                Delete
              </BaseButton>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Edit Sample Modal -->
    <BaseModal
      :model-value="editingSample !== null"
      @update:model-value="closeModal"
    >
      <template #header>
        <h2>Edit Sample</h2>
      </template>
      <form id="sample-form" @submit.prevent="submitSample">
        <FormField label="Name">
          <BaseInput v-model="sampleForm.name" required />
        </FormField>
        <FormField label="Duration (seconds)">
          <BaseInput
            v-model.number="sampleForm.duration"
            type="number"
            min="0"
            step="0.01"
          />
        </FormField>
      </form>
      <template #footer>
        <BaseButton variant="outline" @click="closeModal">Cancel</BaseButton>
        <BaseButton variant="accent2" type="submit" form="sample-form"
          >Save</BaseButton
        >
      </template>
    </BaseModal>

    <!-- Delete confirmation -->
    <BaseModal
      :model-value="pendingDeleteSample !== null"
      @update:model-value="cancelDeleteSample"
    >
      <template #header>
        <h2>Delete sample?</h2>
      </template>
      <p>Delete sample "{{ pendingDeleteSample?.name }}"?</p>
      <template #footer>
        <BaseButton variant="outline" @click="cancelDeleteSample"
          >Cancel</BaseButton
        >
        <BaseButton variant="danger" @click="executeDeleteSample">
          Delete
        </BaseButton>
      </template>
    </BaseModal>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import AdminLayout from "../../layouts/AdminLayout.vue";
import { useAdminStore } from "../../stores/adminStore";
import { formatDuration } from "../../lib/utils/audioFormatter";
import { useToast } from "../../composables/useToast";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseModal from "../../components/ui/BaseModal.vue";
import BaseSpinner from "../../components/ui/BaseSpinner.vue";
import EmptyState from "../../components/ui/EmptyState.vue";
import FormField from "../../components/ui/FormField.vue";
import BaseInput from "../../components/ui/BaseInput.vue";

const route = useRoute();
const adminStore = useAdminStore();
const toast = useToast();

const currentPack = computed(() => adminStore.currentPack);
const currentFolder = ref<any>(null);
const currentSamples = computed(() => adminStore.currentSamples);

const editingSample = ref<any>(null);
const sampleForm = reactive({
  name: "",
  duration: 0,
});

onMounted(async () => {
  const packId = route.params.packId as string;
  const folderId = route.params.folderId as string;

  // Fetch pack if not already loaded
  if (!adminStore.currentPack || adminStore.currentPack.id !== packId) {
    await adminStore.fetchPackDetail(packId);
  }

  // Find folder in current folders
  currentFolder.value = adminStore.currentFolders.find(
    (f) => f.id === folderId,
  );

  // Fetch samples
  await adminStore.fetchSamples(folderId);
});

onUnmounted(() => {
  adminStore.resetFolderDetail();
});

function editSample(sample: any) {
  editingSample.value = sample;
  sampleForm.name = sample.name;
  sampleForm.duration = sample.duration;
}

function closeModal() {
  editingSample.value = null;
  sampleForm.name = "";
  sampleForm.duration = 0;
}

async function submitSample() {
  if (editingSample.value) {
    const result = await adminStore.updateSample(editingSample.value.id, {
      name: sampleForm.name,
      duration: sampleForm.duration,
    });
    if (result.error) {
      toast.error(`Erreur lors de la mise à jour de "${sampleForm.name}".`);
    } else {
      toast.success(`Sample "${sampleForm.name}" mis à jour.`);
    }
  }
  closeModal();
}

const pendingDeleteSample = ref<any>(null);

function confirmDeleteSample(sample: any) {
  pendingDeleteSample.value = sample;
}

function cancelDeleteSample() {
  pendingDeleteSample.value = null;
}

async function executeDeleteSample() {
  if (!pendingDeleteSample.value) return;
  const sample = pendingDeleteSample.value;
  const result = await adminStore.deleteSample(sample.id);
  if (result.error) {
    toast.error(`Erreur lors de la suppression de "${sample.name}".`);
  } else {
    toast.success(`Sample "${sample.name}" supprimé.`);
  }
  pendingDeleteSample.value = null;
}
</script>

<style scoped lang="scss">
.admin-folder-detail {
  h1 {
    margin: 0;
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

.folder-info-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--color-bg-admin-surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  border: 1px solid rgba(122, 15, 62, 0.3);
}

.folder-icon {
  font-size: 36px;
}

.folder-details {
  flex: 1;
}

.folder-meta {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
}

.samples-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sample-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  background: var(--color-bg-admin-surface);
  border-radius: var(--radius-md);
  border: 1px solid rgba(122, 15, 62, 0.3);
}

.sample-icon {
  font-size: 20px;
}

.sample-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sample-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-white);
}

.sample-meta {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.sample-actions {
  display: flex;
  gap: 8px;
}
</style>
