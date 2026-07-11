<template>
  <div class="user-samples-panel">
    <div class="storage-quota">
      <div class="quota-info">
        <span>{{ usedMb }} Mo utilisés sur {{ quotaMb }} Mo</span>
        <span class="quota-percent">{{ quotaPercent }}%</span>
      </div>
      <div class="quota-bar">
        <div
          class="quota-bar-fill"
          :style="{ width: quotaPercent + '%' }"
        ></div>
      </div>
    </div>

    <div
      class="drop-zone"
      :class="{ 'drag-over': isDragOver }"
      @dragover.prevent="isDragOver = true"
      @dragleave="isDragOver = false"
      @drop.prevent="handleDrop"
    >
      <input
        ref="fileInput"
        type="file"
        accept="audio/*"
        multiple
        class="hidden-input"
        @change="handleFileSelect"
      />
      <p>
        Glissez des fichiers audio ici ou
        <button type="button" class="browse-btn" @click="fileInput?.click()">
          parcourir
        </button>
      </p>
      <span class="drop-hint" v-if="userSamplesStore.uploading"
        >Envoi en cours…</span
      >
    </div>

    <div class="samples-table-wrapper" v-if="userSamplesStore.mySamples.length">
      <table class="samples-table">
        <thead>
          <tr>
            <th class="col-preview"></th>
            <th>Nom</th>
            <th>Taille</th>
            <th>Utilisation</th>
            <th>Importé le</th>
            <th>Dernière utilisation</th>
            <th class="col-actions"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sample in userSamplesStore.mySamples" :key="sample.id">
            <td class="col-preview">
              <SamplePreviewButton :sample="sample" />
            </td>
            <td class="col-name">{{ sample.name }}</td>
            <td>{{ formatSize(userSamplesStore.getSampleSize(sample.id)) }}</td>
            <td>{{ usageLabel(sample.id) }}</td>
            <td>{{ formatDate(userSamplesStore.getCreatedAt(sample.id)) }}</td>
            <td>{{ formatDate(userSamplesStore.getLastUsedAt(sample.id)) }}</td>
            <td class="col-actions">
              <button
                type="button"
                class="delete-btn"
                @click="handleDelete(sample)"
              >
                Supprimer
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else class="empty-state">Aucun sample uploadé pour le moment.</p>

    <Teleport to="body">
      <div v-if="pendingDelete" class="modal-overlay" @click="cancelDelete">
        <div class="modal" @click.stop>
          <h3>Supprimer « {{ pendingDelete.name }} » ?</h3>
          <p>
            Ce sample est utilisé dans {{ pendingUsage.length }} projet{{
              pendingUsage.length > 1 ? "s" : ""
            }}
            :
          </p>
          <ul class="usage-list">
            <li v-for="project in pendingUsage" :key="project.id">
              {{ project.name }}
            </li>
          </ul>
          <p class="warning-text">
            La suppression retirera les clips correspondants dans ces projets.
          </p>
          <div class="modal-actions">
            <BaseButton
              variant="secondary"
              :disabled="isDeleting"
              @click="cancelDelete"
            >
              Annuler
            </BaseButton>
            <BaseButton
              variant="error"
              :loading="isDeleting"
              @click="confirmDelete"
            >
              Supprimer
            </BaseButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { AudioSample } from "../../lib/utils/types";
import {
  useUserSamplesStore,
  type SampleUsageProject,
} from "../../stores/userSamplesStore";
import BaseButton from "../ui/BaseButton.vue";
import SamplePreviewButton from "../shared/SamplePreviewButton.vue";
import { formatShortDate } from "../../lib/utils/dateFormatter";

const userSamplesStore = useUserSamplesStore();

const fileInput = ref<HTMLInputElement | null>(null);
const isDragOver = ref(false);
const pendingDelete = ref<AudioSample | null>(null);
const pendingUsage = ref<SampleUsageProject[]>([]);
const isDeleting = ref(false);

const usedMb = computed(() =>
  (userSamplesStore.usedBytes / (1024 * 1024)).toFixed(1),
);
const quotaMb = computed(() =>
  Math.round(userSamplesStore.quotaBytes / (1024 * 1024)),
);
const quotaPercent = computed(() => {
  if (!userSamplesStore.quotaBytes) return 0;
  return Math.min(
    100,
    Math.round(
      (userSamplesStore.usedBytes / userSamplesStore.quotaBytes) * 100,
    ),
  );
});

const formatSize = (bytes: number) =>
  `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;

const usageLabel = (id: string) => {
  const count = userSamplesStore.getUsageCount(id);
  if (count === 0) return "Inutilisé";
  return `Utilisé dans ${count} projet${count > 1 ? "s" : ""}`;
};

const formatDate = (dateString: string | null) =>
  dateString ? formatShortDate(dateString) : "—";

async function uploadFiles(files: FileList) {
  for (const file of Array.from(files)) {
    await userSamplesStore.uploadSample(file);
  }
}

function handleDrop(event: DragEvent) {
  isDragOver.value = false;
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) uploadFiles(files);
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    uploadFiles(input.files);
    input.value = "";
  }
}

async function handleDelete(sample: AudioSample) {
  const usage = await userSamplesStore.fetchSampleUsage(sample.id);
  if (usage.length === 0) {
    await userSamplesStore.deleteSample(sample.id);
    return;
  }
  pendingDelete.value = sample;
  pendingUsage.value = usage;
}

function cancelDelete() {
  pendingDelete.value = null;
  pendingUsage.value = [];
}

async function confirmDelete() {
  if (!pendingDelete.value || isDeleting.value) return;
  isDeleting.value = true;
  await userSamplesStore.deleteSample(pendingDelete.value.id);
  isDeleting.value = false;
  cancelDelete();
}

onMounted(() => {
  userSamplesStore.fetchStorageUsage();
  userSamplesStore.fetchMySamples();
});
</script>

<style scoped lang="scss">
.user-samples-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.storage-quota {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quota-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--color-white-light);
}

.quota-percent {
  font-weight: 600;
  color: var(--color-accent);
}

.quota-bar {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.quota-bar-fill {
  height: 100%;
  border-radius: 4px;
  background: var(--color-accent3-hover);
  transition: width 0.3s ease;
}

.drop-zone {
  border: 2px dashed var(--color-border-secondary);
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  transition: all 0.15s;

  &:hover,
  &.drag-over {
    border-color: var(--color-accent3-hover);
    background: rgba(122, 15, 62, 0.08);
  }

  p {
    margin: 0;
    color: var(--color-white-light);
    font-size: 0.9rem;
  }
}

.hidden-input {
  display: none;
}

.browse-btn {
  background: none;
  border: none;
  color: var(--color-accent3-hover);
  cursor: pointer;
  text-decoration: underline;
}

.drop-hint {
  display: block;
  margin-top: 8px;
  font-size: 0.8rem;
  color: var(--color-white-light);
  opacity: 0.7;
}

.samples-table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--color-border-secondary);
  border-radius: 8px;
}

.samples-table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;

  th,
  td {
    padding: 10px 14px;
    text-align: left;
    font-size: 0.85rem;
  }

  thead th {
    color: var(--color-white-light);
    opacity: 0.6;
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--color-border-secondary);
  }

  tbody tr {
    background: var(--color-bg-secondary-dark);

    &:not(:last-child) {
      border-bottom: 1px solid var(--color-border-secondary);
    }
  }

  td {
    color: var(--color-white-light);
  }

  .col-preview,
  .col-actions {
    width: 1%;
  }

  .col-name {
    color: var(--color-white);
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.delete-btn {
  background: none;
  border: none;
  color: var(--color-status-error);
  cursor: pointer;
  font-size: 0.8rem;
  text-decoration: underline;
}

.empty-state {
  color: var(--color-white-light);
  opacity: 0.6;
  font-size: 0.9rem;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: var(--color-bg-secondary-dark);
  border: 1px solid var(--color-border-secondary);
  border-radius: 16px;
  padding: 32px;
  max-width: 420px;
  width: 90%;

  h3 {
    color: var(--color-white);
    font-size: 1.25rem;
    margin: 0 0 12px;
  }

  p {
    color: var(--color-white-light);
    opacity: 0.75;
    margin: 0 0 12px;
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .warning-text {
    margin: 0 0 24px;
  }
}

.usage-list {
  margin: 0 0 16px;
  padding-left: 20px;
  max-height: 160px;
  overflow-y: auto;

  li {
    color: var(--color-white);
    font-size: 0.9rem;
    margin-bottom: 4px;
  }
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
