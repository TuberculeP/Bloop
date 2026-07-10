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

    <ul class="samples-list" v-if="userSamplesStore.mySamples.length">
      <li
        v-for="sample in userSamplesStore.mySamples"
        :key="sample.id"
        class="sample-item"
      >
        <span class="sample-name">{{ sample.name }}</span>
        <span class="sample-size">{{
          formatSize(userSamplesStore.getSampleSize(sample.id))
        }}</span>
        <span class="sample-usage">{{ usageLabel(sample.id) }}</span>
        <button type="button" class="delete-btn" @click="handleDelete(sample)">
          Supprimer
        </button>
      </li>
    </ul>
    <p v-else class="empty-state">Aucun sample uploadé pour le moment.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { AudioSample } from "../../lib/utils/types";
import { useUserSamplesStore } from "../../stores/userSamplesStore";

const userSamplesStore = useUserSamplesStore();

const fileInput = ref<HTMLInputElement | null>(null);
const isDragOver = ref(false);

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
  if (usage.length > 0) {
    const list = usage.map((p) => `- ${p.name}`).join("\n");
    const confirmed = confirm(
      `Ce sample est utilisé dans ${usage.length} projet(s) :\n${list}\n\nLe supprimer retirera les clips correspondants dans ces projets. Continuer ?`,
    );
    if (!confirmed) return;
  }
  await userSamplesStore.deleteSample(sample.id);
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

.samples-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.sample-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--color-bg-secondary-dark);
  border: 1px solid var(--color-border-secondary);
  border-radius: 8px;
}

.sample-name {
  flex: 1;
  color: var(--color-white);
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sample-size {
  font-size: 0.8rem;
  color: var(--color-white-light);
  opacity: 0.7;
}

.sample-usage {
  font-size: 0.8rem;
  color: var(--color-white-light);
  opacity: 0.7;
  white-space: nowrap;
}

.delete-btn {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-size: 0.8rem;
  text-decoration: underline;
}

.empty-state {
  color: var(--color-white-light);
  opacity: 0.6;
  font-size: 0.9rem;
}
</style>
