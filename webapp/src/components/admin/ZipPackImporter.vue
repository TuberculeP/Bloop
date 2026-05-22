<template>
  <div class="zip-importer">
    <!-- Step 1: Drop Zone -->
    <div v-if="!zipFile" class="step-dropzone">
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
          accept=".zip"
          @change="handleFileSelect"
          class="hidden-input"
        />
        <div class="drop-content">
          <span class="drop-icon">ZIP</span>
          <p>
            Drag a ZIP file here or
            <button
              type="button"
              @click="fileInput?.click()"
              class="browse-btn"
            >
              browse
            </button>
          </p>
          <span class="drop-hint">Maximum 500MB</span>
        </div>
      </div>
    </div>

    <!-- Step 2: Preview & Config -->
    <div v-else-if="!isUploading" class="step-preview">
      <div class="preview-header">
        <h3>{{ zipFile.name }}</h3>
        <button type="button" @click="reset" class="btn-reset">
          Change file
        </button>
      </div>

      <div v-if="isParsing" class="parsing-state">
        <span class="spinner"></span>
        Analyzing ZIP content...
      </div>

      <template v-else-if="parsedStructure">
        <form @submit.prevent="startImport" class="pack-form">
          <div class="form-group">
            <label>Pack Name</label>
            <input v-model="packName" required placeholder="My Sample Pack" />
          </div>
          <div class="form-group">
            <label>Slug (URL-friendly)</label>
            <input
              v-model="packSlug"
              required
              pattern="[a-z0-9-]+"
              placeholder="my-sample-pack"
            />
          </div>
          <div class="form-group">
            <label>Author (optional)</label>
            <input v-model="packAuthor" placeholder="Author name" />
          </div>

          <div class="structure-preview">
            <h4>Content Preview</h4>
            <div class="folder-list">
              <div
                v-for="folder in parsedStructure.folders"
                :key="folder.name"
                class="folder-item"
              >
                <span class="folder-icon">FOLDER</span>
                <span class="folder-name">{{ folder.name }}</span>
                <span class="folder-count"
                  >{{ folder.samples.length }} samples</span
                >
              </div>
              <div v-if="parsedStructure.cover" class="cover-item">
                <span class="cover-icon">IMG</span>
                <span class="cover-name">{{ parsedStructure.cover.name }}</span>
                <span class="cover-badge">Cover</span>
              </div>
            </div>

            <div class="stats">
              <span>{{ totalFolders }} folders</span>
              <span>{{ totalSamples }} samples</span>
              <span v-if="parsedStructure.cover">+ cover</span>
            </div>
          </div>

          <div v-if="parsedStructure.warnings.length > 0" class="warnings">
            <h4>Warnings ({{ parsedStructure.warnings.length }})</h4>
            <ul>
              <li
                v-for="(warning, i) in parsedStructure.warnings.slice(0, 5)"
                :key="i"
              >
                {{ warning }}
              </li>
              <li v-if="parsedStructure.warnings.length > 5">
                ... and {{ parsedStructure.warnings.length - 5 }} more
              </li>
            </ul>
          </div>

          <div class="form-actions">
            <button
              type="button"
              @click="$emit('cancel')"
              class="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" class="btn-primary" :disabled="!canImport">
              Import Pack
            </button>
          </div>
        </form>
      </template>

      <div v-else-if="parseError" class="error-state">
        <p>{{ parseError }}</p>
        <button type="button" @click="reset" class="btn-secondary">
          Try again
        </button>
      </div>
    </div>

    <!-- Step 3: Upload Progress -->
    <div v-else class="step-uploading">
      <div class="upload-status">
        <div class="progress-info">
          <span class="progress-stage">Importing pack...</span>
          <span class="progress-percent">{{ uploadProgress }}%</span>
        </div>
        <div class="progress-bar-container">
          <div
            class="progress-bar-fill"
            :style="{ width: uploadProgress + '%' }"
          ></div>
        </div>
        <p class="upload-hint">{{ currentFile || 'Starting...' }}</p>
      </div>
    </div>

    <!-- Result -->
    <div
      v-if="importResult"
      class="import-result"
      :class="{ success: importResult.success, error: !importResult.success }"
    >
      <template v-if="importResult.success">
        <p class="result-title">Pack imported successfully!</p>
        <p>
          {{ importResult.pack?.foldersCount }} folders,
          {{ importResult.pack?.samplesCount }} samples
        </p>
        <div v-if="importResult.warnings?.length" class="result-warnings">
          <small
            >{{ importResult.warnings.length }} warnings during import</small
          >
        </div>
      </template>
      <template v-else>
        <p class="result-title">Import failed</p>
        <p>{{ importResult.error }}</p>
      </template>
      <button
        type="button"
        @click="$emit('done', importResult)"
        class="btn-primary"
      >
        {{ importResult.success ? "Done" : "Close" }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import JSZip from "jszip";
import { useAdminStore } from "../../stores/adminStore";

interface ParsedSample {
  name: string;
  path: string;
  size: number;
}

interface ParsedFolder {
  name: string;
  samples: ParsedSample[];
}

interface ParsedStructure {
  folders: ParsedFolder[];
  cover: { name: string; path: string } | null;
  warnings: string[];
}

defineEmits<{
  (e: "cancel"): void;
  (e: "done", result: any): void;
}>();

const adminStore = useAdminStore();

const AUDIO_EXTENSIONS = [".wav", ".mp3", ".ogg", ".flac", ".aiff"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

const fileInput = ref<HTMLInputElement | null>(null);
const isDragOver = ref(false);
const zipFile = ref<File | null>(null);
const isParsing = ref(false);
const parseError = ref<string | null>(null);
const parsedStructure = ref<ParsedStructure | null>(null);
const isUploading = ref(false);
const importResult = ref<any>(null);
const uploadProgress = ref(0);
const uploadStage = ref<"upload" | "processing">("upload");
const currentFile = ref("");

const packName = ref("");
const packSlug = ref("");
const packAuthor = ref("");

const totalFolders = computed(() => parsedStructure.value?.folders.length || 0);
const totalSamples = computed(() => {
  if (!parsedStructure.value) return 0;
  return parsedStructure.value.folders.reduce(
    (sum, f) => sum + f.samples.length,
    0,
  );
});

const canImport = computed(() => {
  return (
    packName.value.trim() &&
    packSlug.value.trim() &&
    /^[a-z0-9-]+$/.test(packSlug.value) &&
    totalSamples.value > 0
  );
});

watch(packName, (name) => {
  if (
    !packSlug.value ||
    packSlug.value === generateSlug(packName.value.slice(0, -1))
  ) {
    packSlug.value = generateSlug(name);
  }
});

function generateSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

function handleDrop(event: DragEvent) {
  isDragOver.value = false;
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    selectFile(files[0]);
  }
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    selectFile(input.files[0]);
    input.value = "";
  }
}

async function selectFile(file: File) {
  if (!file.name.toLowerCase().endsWith(".zip")) {
    parseError.value = "Please select a ZIP file";
    return;
  }

  if (file.size > 500 * 1024 * 1024) {
    parseError.value = "ZIP file is too large (max 500MB)";
    return;
  }

  zipFile.value = file;
  parseError.value = null;

  const baseName = file.name.replace(/\.zip$/i, "");
  packName.value = baseName;
  packSlug.value = generateSlug(baseName);

  await parseZip(file);
}

async function parseZip(file: File) {
  isParsing.value = true;
  parseError.value = null;

  try {
    const zip = await JSZip.loadAsync(file);
    const folders = new Map<string, ParsedSample[]>();
    let cover: { name: string; path: string } | null = null;
    const warnings: string[] = [];

    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue;

      const pathParts = path.split("/").filter(Boolean);
      const fileName = pathParts[pathParts.length - 1];

      if (fileName.startsWith(".") || fileName.startsWith("__MACOSX")) {
        continue;
      }

      const ext = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();

      if (IMAGE_EXTENSIONS.includes(ext)) {
        const baseName = fileName
          .substring(0, fileName.lastIndexOf("."))
          .toLowerCase();
        if (
          baseName === "cover" ||
          baseName === "artwork" ||
          baseName === "folder"
        ) {
          cover = { name: fileName, path };
        }
        continue;
      }

      if (!AUDIO_EXTENSIONS.includes(ext)) {
        warnings.push(`Skipped non-audio file: ${path}`);
        continue;
      }

      let folderName: string;
      if (pathParts.length > 1) {
        folderName = pathParts[0];
      } else {
        folderName = "featured";
      }

      if (!folders.has(folderName)) {
        folders.set(folderName, []);
      }

      folders.get(folderName)!.push({
        name: fileName.substring(0, fileName.lastIndexOf(".")),
        path,
        size: 0,
      });
    }

    if (folders.size === 0) {
      parseError.value = "No valid audio files found in ZIP";
      parsedStructure.value = null;
    } else {
      const sortedFolders: ParsedFolder[] = Array.from(folders.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, samples]) => ({
          name,
          samples: samples.sort((a, b) => a.name.localeCompare(b.name)),
        }));

      parsedStructure.value = { folders: sortedFolders, cover, warnings };
    }
  } catch (error) {
    console.error("Parse error:", error);
    parseError.value = "Failed to parse ZIP file";
    parsedStructure.value = null;
  } finally {
    isParsing.value = false;
  }
}

async function startImport() {
  if (!zipFile.value || !canImport.value) return;

  isUploading.value = true;
  importResult.value = null;
  uploadProgress.value = 0;
  uploadStage.value = "upload";
  currentFile.value = "";

  const formData = new FormData();
  formData.append("zipFile", zipFile.value);
  formData.append("name", packName.value.trim());
  formData.append("slug", packSlug.value.trim());
  if (packAuthor.value.trim()) {
    formData.append("author", packAuthor.value.trim());
  }

  try {
    const response = await fetch("/api/admin/import-pack", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json();
      isUploading.value = false;
      importResult.value = {
        success: false,
        error: errorData.error || "Import failed",
      };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const event = JSON.parse(line.slice(6));
            handleSSEEvent(event);
          } catch {
            // Ignore parse errors
          }
        }
      }
    }

    // Process any remaining data
    if (buffer.startsWith("data: ")) {
      try {
        const event = JSON.parse(buffer.slice(6));
        handleSSEEvent(event);
      } catch {
        // Ignore
      }
    }
  } catch (error) {
    isUploading.value = false;
    importResult.value = {
      success: false,
      error: error instanceof Error ? error.message : "Import failed",
    };
  }
}

function handleSSEEvent(event: any) {
  if (event.type === "progress") {
    uploadProgress.value = event.progress;
    uploadStage.value = "processing";
    if (event.file) {
      currentFile.value = event.file;
    }
  } else if (event.type === "complete") {
    isUploading.value = false;
    importResult.value = {
      success: true,
      pack: event.pack,
      warnings: event.warnings,
    };
    adminStore.fetchPacks();
  } else if (event.type === "error") {
    isUploading.value = false;
    importResult.value = {
      success: false,
      error: event.error,
    };
  }
}

function reset() {
  zipFile.value = null;
  parsedStructure.value = null;
  parseError.value = null;
  packName.value = "";
  packSlug.value = "";
  packAuthor.value = "";
  importResult.value = null;
}
</script>

<style scoped lang="scss">
.zip-importer {
  width: 100%;
}

.drop-zone {
  border: 2px dashed rgba(122, 15, 62, 0.5);
  border-radius: 12px;
  padding: 48px 32px;
  text-align: center;
  transition: all 0.15s;
  cursor: pointer;

  &:hover,
  &.drag-over {
    border-color: #ff3fb4;
    background: rgba(255, 63, 180, 0.05);
  }
}

.hidden-input {
  display: none;
}

.drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.drop-icon {
  font-size: 14px;
  font-weight: 700;
  color: #ff3fb4;
  padding: 16px 24px;
  border: 2px solid rgba(255, 63, 180, 0.3);
  border-radius: 8px;
}

.drop-content p {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.browse-btn {
  background: none;
  border: none;
  color: #ff3fb4;
  font-size: 14px;
  cursor: pointer;
  text-decoration: underline;

  &:hover {
    color: #e0359e;
  }
}

.drop-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.step-preview {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-size: 16px;
    color: #f2efe8;
    font-weight: 500;
  }
}

.btn-reset {
  background: none;
  border: none;
  color: #ff3fb4;
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
}

.parsing-state,
.error-state {
  text-align: center;
  padding: 32px;
  color: rgba(255, 255, 255, 0.6);

  p {
    margin: 12px 0 0;
  }
}

.error-state p {
  color: #ef4444;
}

.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 63, 180, 0.3);
  border-top-color: #ff3fb4;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.pack-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
  }

  input {
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

    &::placeholder {
      color: rgba(255, 255, 255, 0.3);
    }
  }
}

.structure-preview {
  background: #1a0e15;
  border-radius: 8px;
  padding: 16px;

  h4 {
    margin: 0 0 12px;
    font-size: 13px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.folder-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.folder-item,
.cover-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
}

.folder-icon,
.cover-icon {
  font-size: 10px;
  font-weight: 600;
  color: #ff3fb4;
  padding: 4px 6px;
  background: rgba(255, 63, 180, 0.15);
  border-radius: 4px;
}

.cover-icon {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.15);
}

.folder-name,
.cover-name {
  flex: 1;
  font-size: 13px;
  color: #f2efe8;
}

.folder-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.cover-badge {
  font-size: 10px;
  font-weight: 500;
  color: #22c55e;
  padding: 2px 6px;
  background: rgba(34, 197, 94, 0.15);
  border-radius: 4px;
}

.stats {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);

  span {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
  }
}

.warnings {
  background: rgba(234, 179, 8, 0.1);
  border: 1px solid rgba(234, 179, 8, 0.3);
  border-radius: 8px;
  padding: 12px 16px;

  h4 {
    margin: 0 0 8px;
    font-size: 13px;
    font-weight: 500;
    color: #eab308;
  }

  ul {
    margin: 0;
    padding-left: 20px;

    li {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 4px;
    }
  }
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
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

  &:hover:not(:disabled) {
    background: #e0359e;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

.step-uploading {
  padding: 48px 32px;
}

.upload-status {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;

  .upload-hint {
    color: rgba(255, 255, 255, 0.5);
    font-size: 12px;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-stage {
  font-size: 14px;
  font-weight: 500;
  color: #f2efe8;
}

.progress-percent {
  font-size: 14px;
  font-weight: 600;
  color: #ff3fb4;
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff3fb4 0%, #e0359e 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.import-result {
  text-align: center;
  padding: 24px;
  border-radius: 8px;
  margin-top: 16px;

  &.success {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);

    .result-title {
      color: #22c55e;
    }
  }

  &.error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);

    .result-title {
      color: #ef4444;
    }
  }

  .result-title {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 500;
  }

  p {
    margin: 0 0 16px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
  }

  .result-warnings {
    margin-bottom: 16px;

    small {
      color: #eab308;
    }
  }
}
</style>
