<script setup lang="ts">
import BaseModal from "../../ui/BaseModal.vue";
import BaseButton from "../../ui/BaseButton.vue";
import AudioLibraryPanel from "../timeline/AudioLibraryPanel.vue";
import type { AudioSample } from "../../../lib/utils/types";

defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "select", sample: AudioSample): void;
}>();

const handleSelect = (sample: AudioSample): void => {
  emit("select", sample);
  emit("update:modelValue", false);
};
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    size="large"
    modal-class="sample-picker-modal"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #header>
      <div class="picker-header">
        <h3>Choisir un sample</h3>
        <BaseButton
          right-icon="fas fa-times"
          @click="emit('update:modelValue', false)"
        />
      </div>
    </template>
    <div class="picker-body">
      <AudioLibraryPanel selectable @select="handleSelect" />
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;

  h3 {
    margin: 0;
    font-size: 16px;
    color: var(--color-white);
  }
}

:deep(.sample-picker-modal) {
  max-width: 900px;
}

.picker-body {
  height: 70vh;

  // AudioLibraryPanel a son propre header ("Audio Library") redondant avec
  // celui de la modale, et une largeur fixe pilotée par son resize-handle
  // (pensée pour une sidebar) — on neutralise les deux ici.
  :deep(.audio-library-panel) {
    width: 100% !important;
  }
  :deep(.panel-header) {
    display: none;
  }
  :deep(.resize-handle) {
    display: none;
  }
}
</style>
