<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { storeToRefs } from "pinia";
import { useAudioLibraryStore } from "../../../stores/audioLibraryStore";
import { useUserSamplesStore } from "../../../stores/userSamplesStore";
import { useResizablePanel } from "../../../composables/useResizablePanel";
import SamplePreviewButton from "../../shared/SamplePreviewButton.vue";
import TabBar from "../../shared/TabBar.vue";
import type { TabItem } from "../../shared/TabBar.vue";
import BaseSpinner from "../../ui/BaseSpinner.vue";
import EmptyState from "../../ui/EmptyState.vue";
import type {
  SamplePack,
  SampleFolder,
  AudioSample,
} from "../../../lib/utils/types";

withDefaults(
  defineProps<{
    selectable?: boolean;
  }>(),
  { selectable: false },
);

const emit = defineEmits<{
  (e: "select", sample: AudioSample): void;
}>();

const audioLibraryStore = useAudioLibraryStore();
const userSamplesStore = useUserSamplesStore();
const { previewingId } = storeToRefs(audioLibraryStore);

const {
  width: panelWidth,
  isResizing,
  startResize,
} = useResizablePanel({
  storageKey: "audio-library-panel-width",
  defaultWidth: 280,
  minWidth: 220,
  maxWidth: 560,
});

type NavigationLevel = "packs" | "folders" | "samples";
type LibraryTab = "packs" | "personal" | "search";

const activeTab = ref<LibraryTab>("packs");
const libraryTabs: TabItem[] = [
  { id: "packs", label: "Packs", icon: "fas fa-box" },
  { id: "personal", label: "Mes Samples", icon: "fas fa-user" },
  { id: "search", label: "Rechercher", icon: "fas fa-search" },
];

const currentLevel = ref<NavigationLevel>("packs");
const selectedPack = ref<SamplePack | null>(null);
const selectedFolder = ref<SampleFolder | null>(null);
const isLoading = ref(false);

const personalSamples = computed(() => userSamplesStore.mySamples);

interface SearchResultItem {
  sample: AudioSample;
  origin: string;
}

const searchQuery = ref("");
let searchTimeout: ReturnType<typeof setTimeout>;

const debouncedSearch = (): void => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    audioLibraryStore.searchSamples(searchQuery.value);
  }, 300);
};

onBeforeUnmount(() => {
  clearTimeout(searchTimeout);
});

const searchResultItems = computed<SearchResultItem[]>(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (query.length < 2) return [];

  const personal: SearchResultItem[] = personalSamples.value
    .filter((s) => s.name.toLowerCase().includes(query))
    .map((sample) => ({ sample, origin: "Perso" }));

  const packResults: SearchResultItem[] = audioLibraryStore.searchResults.map(
    (sample) => ({
      sample,
      origin: audioLibraryStore.getPack(sample.packId)?.name ?? sample.packId,
    }),
  );

  return [...personal, ...packResults];
});

const hasMoreResults = computed(
  () =>
    audioLibraryStore.searchPagination.page <
    audioLibraryStore.searchPagination.pages,
);

const loadMoreResults = (): void => {
  audioLibraryStore.searchSamples(
    searchQuery.value,
    audioLibraryStore.searchPagination.page + 1,
  );
};

onMounted(async () => {
  isLoading.value = true;
  await audioLibraryStore.initialize();
  isLoading.value = false;
  userSamplesStore.fetchMySamples();
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

const handleSelect = (sample: AudioSample): void => {
  emit("select", sample);
};

const getSampleCount = (pack: SamplePack): number => {
  return pack.folders.reduce((acc, f) => acc + f.samples.length, 0);
};
</script>

<template>
  <div
    class="audio-library-panel"
    :class="{ 'is-resizing': isResizing }"
    :style="{ width: panelWidth + 'px' }"
  >
    <div class="panel-header">
      <h3>Audio Library</h3>
    </div>

    <TabBar class="library-tabs" :tabs="libraryTabs" v-model="activeTab" />

    <template v-if="activeTab === 'packs'">
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
        <BaseSpinner color="accent2" />
        <span>Chargement...</span>
      </div>

      <EmptyState
        v-else-if="packs.length === 0"
        title="No sample packs available"
        message="Add packs to /public/samples/packs/"
      />

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
                <span class="pack-count"
                  >{{ getSampleCount(pack) }} samples</span
                >
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
            <button
              v-if="selectable"
              type="button"
              class="sample-select-btn"
              title="Utiliser ce sample"
              @click.stop="handleSelect(sample)"
            >
              <i class="fas fa-check" />
            </button>
            <div class="drag-hint">⋮⋮</div>
          </div>
        </div>
      </div>
    </template>

    <div v-else-if="activeTab === 'personal'" class="content-area">
      <!-- Mes Samples -->
      <EmptyState
        v-if="personalSamples.length === 0"
        title="Aucun sample personnel"
        message="Uploade des samples depuis ton profil pour les retrouver ici"
      />

      <div v-else class="samples-list">
        <div
          v-for="sample in personalSamples"
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
          <button
            v-if="selectable"
            type="button"
            class="sample-select-btn"
            title="Utiliser ce sample"
            @click.stop="handleSelect(sample)"
          >
            <i class="fas fa-check" />
          </button>
          <div class="drag-hint">⋮⋮</div>
        </div>
      </div>
    </div>

    <div v-else class="content-area search-area">
      <!-- Rechercher -->
      <div class="search-input-wrapper">
        <i class="fas fa-search search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Nom d'un sample..."
          class="search-input"
          @input="debouncedSearch"
        />
      </div>

      <EmptyState
        v-if="searchQuery.trim().length < 2"
        title="Tape au moins 2 caractères pour rechercher"
      />

      <div
        v-else-if="
          audioLibraryStore.isSearching && searchResultItems.length === 0
        "
        class="loading-state"
      >
        <BaseSpinner color="accent2" />
        <span>Recherche...</span>
      </div>

      <EmptyState
        v-else-if="searchResultItems.length === 0"
        title="Aucun résultat"
      />

      <div v-else class="samples-list">
        <div
          v-for="item in searchResultItems"
          :key="item.sample.id"
          class="sample-item"
          :class="{ previewing: previewingId === item.sample.id }"
          draggable="true"
          @dragstart="handleDragStart($event, item.sample.id)"
          @click="handlePreview(item.sample)"
        >
          <SamplePreviewButton :sample="item.sample" />
          <div class="sample-info">
            <span class="sample-name">{{ item.sample.name }}</span>
            <span class="sample-origin">{{ item.origin }}</span>
          </div>
          <button
            v-if="selectable"
            type="button"
            class="sample-select-btn"
            title="Utiliser ce sample"
            @click.stop="handleSelect(item.sample)"
          >
            <i class="fas fa-check" />
          </button>
          <div class="drag-hint">⋮⋮</div>
        </div>

        <button
          v-if="hasMoreResults"
          type="button"
          class="load-more-btn"
          :disabled="audioLibraryStore.isSearching"
          @click="loadMoreResults"
        >
          {{ audioLibraryStore.isSearching ? "Chargement..." : "Charger plus" }}
        </button>
      </div>
    </div>

    <div class="resize-handle" @mousedown="startResize"></div>
  </div>
</template>

<style scoped lang="scss">
.audio-library-panel {
  position: relative;
  height: 100%;
  background: var(--color-bg-surface-deep);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.resize-handle {
  position: absolute;
  top: 0;
  right: -3px;
  width: 6px;
  height: 100%;
  cursor: ew-resize;
  z-index: 10;
  background: transparent;
  transition: background-color 0.15s;

  &:hover,
  .is-resizing & {
    background: var(--color-accent2);
    opacity: 0.6;
  }
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid var(--color-border-secondary);

  h3 {
    margin: 0;
    font-size: 14px;
    color: var(--color-white);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.library-tabs {
  :deep(.tab-bar) {
    margin-bottom: 0;
    padding: 4px 8px 0;
    border-bottom: 1px solid rgba(var(--color-accent3-rgb), 0.3);
  }

  :deep(.tab-btn) {
    padding: 8px 10px;
    font-size: 12px;
    gap: 6px;
  }
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: var(--color-bg-primary-dark);
  border-bottom: 1px solid rgba(var(--color-accent3-rgb), 0.3);
  font-size: 12px;
}

.breadcrumb-item {
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: color 0.15s;

  &:hover:not(.active) {
    color: var(--color-accent2);
  }

  &.active {
    color: var(--color-white);
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
}

.content-area {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border-secondary) transparent;
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
  background: var(--color-bg-primary-dark);
  border-radius: var(--radius-md);
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: var(--color-bg-daw-active);

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
  background: linear-gradient(
    135deg,
    var(--color-accent2) 0%,
    var(--color-accent3) 100%
  );
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
  color: var(--color-white);
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
  background: var(--color-bg-primary-dark);
  border-radius: 6px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: var(--color-bg-daw-active);

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
  color: var(--color-white);
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
  background: var(--color-bg-primary-dark);
  border-radius: 6px;
  margin-bottom: 6px;
  cursor: grab;
  transition: all 0.15s;

  &:hover {
    background: var(--color-bg-daw-active);

    .drag-hint {
      opacity: 1;
    }
  }

  &.previewing {
    background: var(--color-bg-daw-active);
    border: 1px solid var(--color-accent2);
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
  color: var(--color-white);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sample-origin {
  font-size: 11px;
  color: rgba(255, 63, 180, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-area {
  display: flex;
  flex-direction: column;
}

.search-input-wrapper {
  position: relative;
  padding: 8px;

  .search-icon {
    position: absolute;
    left: 20px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 12px;
    color: rgba(255, 255, 255, 0.3);
    pointer-events: none;
  }
}

.search-input {
  width: 100%;
  padding: 8px 10px 8px 30px;
  background: var(--color-bg-primary-dark);
  border: 1px solid var(--color-border-secondary);
  border-radius: 6px;
  color: var(--color-white);
  font-size: 13px;

  &:focus {
    outline: none;
    border-color: var(--color-accent2);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
}

.drag-hint {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.3);
  opacity: 0;
  transition: opacity 0.15s;
}

.sample-select-btn {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--color-border-secondary);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: var(--color-accent2);
    border-color: var(--color-accent2);
    color: var(--color-bg-primary-dark);
  }
}

.load-more-btn {
  width: 100%;
  margin-top: 4px;
  padding: 10px;
  background: var(--color-bg-primary-dark);
  border: 1px solid var(--color-border-secondary);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    background: var(--color-bg-daw-active);
    color: var(--color-white);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.6;
  }
}

@media (max-width: 768px) {
  .audio-library-panel {
    max-width: 70vw;
  }
}
</style>
