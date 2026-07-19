<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from "vue";
import { uploadLearningImage } from "../../services/learning";
import { resizeImageFile } from "../../lib/utils/imageResize";
import { useToast } from "../../composables/useToast";
import BaseModal from "../ui/BaseModal.vue";
import BaseButton from "../ui/BaseButton.vue";

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "confirm", url: string): void;
}>();

const toast = useToast();

const fileInputRef = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const previewUrl = ref<string | null>(null);
const isDragOver = ref(false);
const isUploading = ref(false);

const reset = () => {
  selectedFile.value = null;
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = null;
};

const close = () => {
  reset();
  emit("update:modelValue", false);
};

const setFile = async (file: File) => {
  if (!file.type.startsWith("image/")) {
    toast.error("Le fichier doit être une image.");
    return;
  }

  const resized = await resizeImageFile(file, 1600);
  selectedFile.value = resized;
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = URL.createObjectURL(resized);
};

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) setFile(file);
  input.value = "";
};

const handleDrop = (event: DragEvent) => {
  isDragOver.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) setFile(file);
};

const handlePaste = (event: ClipboardEvent) => {
  if (!props.modelValue) return;
  const item = Array.from(event.clipboardData?.items || []).find((entry) =>
    entry.type.startsWith("image/"),
  );
  const file = item?.getAsFile();
  if (file) setFile(file);
};

const confirm = async () => {
  if (!selectedFile.value) return;

  try {
    isUploading.value = true;
    const url = await uploadLearningImage(selectedFile.value);
    emit("confirm", url);
    close();
  } catch (err) {
    console.error("Erreur lors de l'upload de l'image de couverture:", err);
    toast.error("Erreur lors de l'upload de l'image.");
  } finally {
    isUploading.value = false;
  }
};

watch(
  () => props.modelValue,
  (open) => {
    if (!open) reset();
  },
);

window.addEventListener("paste", handlePaste);
onBeforeUnmount(() => window.removeEventListener("paste", handlePaste));
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    size="normal"
    @update:model-value="close"
  >
    <template #header>
      <h3>Image de couverture</h3>
    </template>

    <div
      v-if="!previewUrl"
      class="cover-dropzone"
      :class="{ 'drag-over': isDragOver }"
      @dragover.prevent="isDragOver = true"
      @dragleave="isDragOver = false"
      @drop.prevent="handleDrop"
      @click="fileInputRef?.click()"
    >
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        class="hidden-input"
        @change="handleFileChange"
      />
      <div class="dropzone-content">
        <i class="fas fa-image dropzone-icon"></i>
        <p>
          Glissez une image, collez-la (<kbd>Ctrl</kbd>+<kbd>V</kbd>) ou
          <span class="browse-link">cliquez pour choisir un fichier</span>
        </p>
      </div>
    </div>

    <div v-else class="cover-preview">
      <img :src="previewUrl" alt="Aperçu de l'image de couverture" />
      <BaseButton
        variant="ghost"
        size="small"
        @click="reset"
        label="Choisir une autre image"
      />
    </div>

    <template #footer>
      <BaseButton variant="outline" @click="close" label="Annuler" />
      <BaseButton
        variant="secondary"
        :disabled="!selectedFile"
        :loading="isUploading"
        @click="confirm"
        label="Valider"
      />
    </template>
  </BaseModal>
</template>

<style scoped>
.cover-dropzone {
  border: 2px dashed var(--color-border-secondary);
  border-radius: var(--radius-lg);
  padding: 48px 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cover-dropzone:hover,
.cover-dropzone.drag-over {
  border-color: var(--color-accent2);
  background: rgba(255, 63, 180, 0.05);
}

.hidden-input {
  display: none;
}

.dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.dropzone-icon {
  font-size: 1.5rem;
  color: var(--color-accent2);
}

.dropzone-content p {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.dropzone-content kbd {
  padding: 1px 6px;
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-sm);
  font-size: 0.8em;
}

.browse-link {
  color: var(--color-accent2);
  text-decoration: underline;
}

.cover-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.cover-preview img {
  max-width: 100%;
  max-height: 320px;
  border-radius: var(--radius-lg);
  object-fit: contain;
}
</style>
