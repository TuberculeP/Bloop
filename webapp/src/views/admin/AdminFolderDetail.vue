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

      <div v-if="!currentFolder" class="loading">Loading...</div>

      <template v-else>
        <div class="folder-info-card">
          <span class="folder-icon">📁</span>
          <div class="folder-details">
            <h1>{{ currentFolder.name }}</h1>
            <span class="folder-meta">{{ currentSamples.length }} samples</span>
          </div>
        </div>

        <h2>Samples ({{ currentSamples.length }})</h2>

        <div v-if="currentSamples.length === 0" class="empty-state">
          <p>No samples in this folder.</p>
        </div>

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
              <button @click="editSample(sample)" class="action-btn">
                Edit
              </button>
              <button
                @click="confirmDeleteSample(sample)"
                class="action-btn danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Edit Sample Modal -->
    <div v-if="editingSample" class="modal-overlay" @click="closeModal">
      <div class="modal" @click.stop>
        <h2>Edit Sample</h2>
        <form @submit.prevent="submitSample">
          <div class="form-group">
            <label>Name</label>
            <input v-model="sampleForm.name" required />
          </div>
          <div class="form-group">
            <label>Duration (seconds)</label>
            <input
              v-model.number="sampleForm.duration"
              type="number"
              min="0"
              step="0.01"
            />
          </div>
          <div class="modal-actions">
            <button type="button" @click="closeModal" class="btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import AdminLayout from "../../layouts/AdminLayout.vue";
import { useAdminStore } from "../../stores/adminStore";
import { formatDuration } from "../../lib/utils/audioFormatter";

const route = useRoute();
const adminStore = useAdminStore();

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
    await adminStore.updateSample(editingSample.value.id, {
      name: sampleForm.name,
      duration: sampleForm.duration,
    });
  }
  closeModal();
}

async function confirmDeleteSample(sample: any) {
  if (confirm(`Delete sample "${sample.name}"?`)) {
    await adminStore.deleteSample(sample.id);
  }
}
</script>

<style scoped lang="scss">
.admin-folder-detail {
  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: #f2efe8;
  }

  h2 {
    margin: 24px 0 16px;
    font-size: 18px;
    font-weight: 500;
    color: #f2efe8;
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
    color: #ff3fb4;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  span {
    color: rgba(255, 255, 255, 0.5);
  }
}

.loading,
.empty-state {
  text-align: center;
  padding: 48px;
  color: rgba(255, 255, 255, 0.6);

  p {
    margin: 0;
  }
}

.folder-info-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #2a1520;
  border-radius: 12px;
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
  background: #2a1520;
  border-radius: 8px;
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
  color: #f2efe8;
}

.sample-meta {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.sample-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 6px;
  color: #f2efe8;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  &.danger {
    color: #ef4444;

    &:hover {
      background: rgba(239, 68, 68, 0.2);
    }
  }
}

// Modal styles
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #2a1520;
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 400px;
  border: 1px solid rgba(122, 15, 62, 0.5);

  h2 {
    margin: 0 0 20px;
    font-size: 18px;
    color: #f2efe8;
  }
}

.form-group {
  margin-bottom: 16px;

  label {
    display: block;
    margin-bottom: 6px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
  }

  input {
    width: 100%;
    padding: 10px 12px;
    background: #1a0e15;
    border: 1px solid rgba(122, 15, 62, 0.5);
    border-radius: 6px;
    color: #f2efe8;
    font-size: 14px;

    &:focus {
      outline: none;
      border-color: #ff3fb4;
    }
  }
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn-primary {
  padding: 10px 20px;
  background: #ff3fb4;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #e0359e;
  }
}

.btn-secondary {
  padding: 10px 20px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: #f2efe8;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
}
</style>
