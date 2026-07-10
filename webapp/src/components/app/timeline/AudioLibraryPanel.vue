<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useAudioLibraryStore } from "../../../stores/audioLibraryStore";
import SamplePreviewButton from "../../shared/SamplePreviewButton.vue";
import type {
  SamplePack,
  SampleFolder,
  AudioSample,
} from "../../../lib/utils/types";

const audioLibraryStore = useAudioLibraryStore();
const { previewingId } = storeToRefs(audioLibraryStore);

type NavigationLevel = "packs" | "folders" | "samples";

const currentLevel = ref<NavigationLevel>("packs");
const selectedPack = ref<SamplePack | null>(null);
const selectedFolder = ref<SampleFolder | null>(null);
const isLoading = ref(false);

onMounted(async () => {
  isLoading.value = true;
  await audioLibraryStore.initialize();
  isLoading.value = false;
});

const packs = computed(() => audioLibraryStore.getAllPacks());

const breadcrumb = computed(() => {
  const parts: Array<{ label: string; level: NavigationLevel }> = [
    { label: "Packs", level: "packs" },
  ];
  if (selectedPack.value) {
    parts.push({ label: selectedPack.value.name, level: "folders" });
  }
  if (selectedFolder.value) {
    parts.push({ label: selectedFolder.value.name, level: "samples" });
  }
  return parts;
});

const navigateTo = (level: NavigationLevel): void => {
  currentLevel.value = level;
  if (level === "packs") {
    selectedPack.value = null;
    selectedFolder.value = null;
  } else if (level === "folders") {
    selectedFolder.value = null;
  }
};

const openPack = async (pack: SamplePack): Promise<void> => {
  isLoading.value = true;

  if (pack.folders.length === 0 || pack.folders.some((f) => f.id)) {
    const details = await audioLibraryStore.fetchPackDetails(pack.id);
    if (details) {
      selectedPack.value = details;
    } else {
      selectedPack.value = pack;
    }
  } else {
    selectedPack.value = pack;
  }

  selectedFolder.value = null;
  currentLevel.value = "folders";
  isLoading.value = false;
};

const openFolder = async (folder: SampleFolder): Promise<void> => {
  if (!selectedPack.value) return;

  isLoading.value = true;

  if (folder.id && folder.samples.length === 0) {
    await audioLibraryStore.fetchFolderSamples(
      selectedPack.value.id,
      folder.id,
    );
    const updatedPack = audioLibraryStore.getPack(selectedPack.value.id);
    if (updatedPack) {
      selectedPack.value = updatedPack;
      const updatedFolder = updatedPack.folders.find(
        (f: SampleFolder) => f.id === folder.id,
      );
      if (updatedFolder) {
        folder = updatedFolder;
      }
    }
  }

  selectedFolder.value = folder;
  currentLevel.value = "samples";
  isLoading.value = false;
};

const handleDragStart = (event: DragEvent, sampleId: string): void => {
  if (event.dataTransfer) {
    event.dataTransfer.setData("application/x-sample-id", sampleId);
    event.dataTransfer.effectAllowed = "copy";
  }
};

const handlePreview = (sample: AudioSample): void => {
  if (previewingId.value === sample.id) {
    audioLibraryStore.stopPreview();
  } else {
    audioLibraryStore.startPreview(sample);
  }
};

const getSampleCount = (pack: SamplePack): number => {
  return pack.folders.reduce((acc, f) => acc + f.samples.length, 0);
};
</script>

<template>
  <div class="audio-library-panel">
    <div class="panel-header">
      <h3>Audio Library</h3>
    </div>

    <div class="breadcrumb">
      <template v-for="(part, index) in breadcrumb" :key="part.level">
        <span
          class="breadcrumb-item"
          :class="{ active: index === breadcrumb.length - 1 }"
          @click="navigateTo(part.level)"
        >
          {{ part.label }}
        </span>
        <span v-if="index < breadcrumb.length - 1" class="breadcrumb-sep"
          >/</span
        >
      </template>
    </div>

    <div v-if="isLoading" class="loading-state">
      <span class="loading-icon">⏳</span>
      <span>Chargement...</span>
    </div>

    <div v-else-if="packs.length === 0" class="empty-state">
      <p>No sample packs available</p>
      <p class="hint">Add packs to /public/samples/packs/</p>
    </div>

    <div v-else class="content-area">
      <!-- Packs List -->
      <div v-if="currentLevel === 'packs'" class="packs-list">
        <div
          v-for="pack in packs"
          :key="pack.id"
          class="pack-item"
          :class="{ featured: pack.featured }"
          @click="openPack(pack)"
        >
          <div class="pack-cover">
            <img
              v-if="pack.cover"
              :src="`/samples/packs/${pack.id}/${pack.cover}`"
              :alt="pack.name"
            />
            <div v-else class="pack-cover-placeholder">
              <span>{{ pack.name.charAt(0).toUpperCase() }}</span>
            </div>
          </div>
          <div class="pack-info">
            <span class="pack-name">{{ pack.name }}</span>
            <span class="pack-meta">
              <span v-if="pack.author" class="pack-author">{{
                pack.author
              }}</span>
              <span class="pack-count">{{ getSampleCount(pack) }} samples</span>
            </span>
          </div>
          <div class="nav-arrow">›</div>
        </div>
      </div>

      <!-- Folders List -->
      <div
        v-else-if="currentLevel === 'folders' && selectedPack"
        class="folders-list"
      >
        <div
          v-for="folder in selectedPack.folders"
          :key="folder.name"
          class="folder-item"
          @click="openFolder(folder)"
        >
          <div class="folder-icon">📁</div>
          <div class="folder-info">
            <span class="folder-name">{{ folder.name }}</span>
            <span class="folder-count"
              >{{ folder.samples.length }} samples</span
            >
          </div>
          <div class="nav-arrow">›</div>
        </div>
      </div>

      <!-- Samples List -->
      <div
        v-else-if="currentLevel === 'samples' && selectedFolder"
        class="samples-list"
      >
        <div
          v-for="sample in selectedFolder.samples"
          :key="sample.id"
          class="sample-item"
          :class="{ previewing: previewingId === sample.id }"
          draggable="true"
          @dragstart="handleDragStart($event, sample.id)"
          @click="handlePreview(sample)"
        >
          <SamplePreviewButton :sample="sample" />
          <div class="sample-info">
            <span class="sample-name">{{ sample.name }}</span>
          </div>
          <div class="drag-hint">⋮⋮</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.audio-library-panel {
  width: 280px;
  height: 100%;
  background: #2a1520;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid rgba(122, 15, 62, 0.5);

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #f2efe8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #1a0e15;
  border-bottom: 1px solid rgba(122, 15, 62, 0.3);
  font-size: 12px;
}

.breadcrumb-item {
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: color 0.15s;

  &:hover:not(.active) {
    color: #ff3fb4;
  }

  &.active {
    color: #f2efe8;
    cursor: default;
  }
}

.breadcrumb-sep {
  color: rgba(255, 255, 255, 0.3);
}

.loading-state {
  padding: 24px 16px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  .loading-icon {
    font-size: 24px;
    animation: pulse 1s ease-in-out infinite;
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.empty-state {
  padding: 24px 16px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);

  p {
    margin: 0 0 8px;
  }

  .hint {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.3);
  }
}

.content-area {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(122, 15, 62, 0.5) transparent;
}

.packs-list,
.folders-list,
.samples-list {
  padding: 8px;
}

.pack-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #1a0e15;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #3d1528;

    .nav-arrow {
      opacity: 1;
      transform: translateX(2px);
    }
  }

  &.featured {
    border: 1px solid rgba(255, 63, 180, 0.3);
  }
}

.pack-cover {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
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
  background: linear-gradient(135deg, #ff3fb4 0%, #7a0f3e 100%);
  display: flex;
  align-items: center;
  justify-content: center;

  span {
    font-size: 20px;
    font-weight: 700;
    color: white;
  }
}

.pack-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pack-name {
  font-size: 14px;
  font-weight: 500;
  color: #f2efe8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pack-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.pack-author {
  color: rgba(255, 63, 180, 0.7);
}

.nav-arrow {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.3);
  opacity: 0;
  transition: all 0.15s;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  background: #1a0e15;
  border-radius: 6px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #3d1528;

    .nav-arrow {
      opacity: 1;
      transform: translateX(2px);
    }
  }
}

.folder-icon {
  font-size: 20px;
}

.folder-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.folder-name {
  font-size: 14px;
  color: #f2efe8;
}

.folder-count {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.sample-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #1a0e15;
  border-radius: 6px;
  margin-bottom: 6px;
  cursor: grab;
  transition: all 0.15s;

  &:hover {
    background: #3d1528;

    .drag-hint {
      opacity: 1;
    }
  }

  &.previewing {
    background: #3d1528;
    border: 1px solid #ff3fb4;
  }

  &:active {
    cursor: grabbing;
  }
}

.sample-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sample-name {
  font-size: 13px;
  color: #f2efe8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drag-hint {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.3);
  opacity: 0;
  transition: opacity 0.15s;
}
</style>
