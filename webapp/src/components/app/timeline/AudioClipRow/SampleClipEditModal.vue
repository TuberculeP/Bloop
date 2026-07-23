<script setup lang="ts">
import { computed } from "vue";
import type { AudioClip } from "../../../../lib/utils/types";
import { useTimelineStore } from "../../../../stores/timelineStore";
import { useAudioLibraryStore } from "../../../../stores/audioLibraryStore";
import { useSampleClipPreview } from "../../../../composables/audioClip/useSampleClipPreview";
import BaseModal from "../../../ui/BaseModal.vue";
import BaseButton from "../../../ui/BaseButton.vue";
import RangeSlider from "../../../ui/RangeSlider.vue";

const props = defineProps<{
  clip: AudioClip;
  trackId: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const timelineStore = useTimelineStore();
const audioLibraryStore = useAudioLibraryStore();
const { isPreviewing, startPreview, stopPreview } = useSampleClipPreview();

// Re-résolu depuis le store à chaque render (plutôt que de faire confiance à
// la référence figée de la prop) pour rester correct après un undo/redo
// pendant que la modale est ouverte (setTrackClips remplace le tableau).
const clip = computed<AudioClip | null>(() => {
  const track = timelineStore.tracks.find((t) => t.id === props.trackId);
  return track?.clips?.find((c) => c.id === props.clip.id) ?? null;
});

const sampleName = computed(
  () => audioLibraryStore.getSample(props.clip.sampleId)?.name ?? "Sample",
);

const semitones = computed(() => clip.value?.semitones ?? 0);
const cents = computed(() => clip.value?.cents ?? 0);

const updateSemitones = (value: number): void => {
  timelineStore.updateClipInTrack(props.trackId, props.clip.id, {
    semitones: value,
  });
};

const updateCents = (value: number): void => {
  timelineStore.updateClipInTrack(props.trackId, props.clip.id, {
    cents: value,
  });
};

const togglePreview = (): void => {
  if (isPreviewing.value) {
    stopPreview();
  } else if (clip.value) {
    startPreview(clip.value);
  }
};

const close = (): void => {
  stopPreview();
  emit("close");
};
</script>

<template>
  <BaseModal
    :model-value="true"
    size="normal"
    modal-class="sample-clip-edit-modal"
    @update:model-value="close"
  >
    <template #header>
      <div class="sample-clip-edit-header">
        <h3>{{ sampleName }}</h3>
        <BaseButton right-icon="fas fa-times" @click="close" />
      </div>
    </template>

    <div v-if="clip" class="sample-clip-edit-body">
      <BaseButton
        class="preview-btn"
        :label="isPreviewing ? 'Arrêter' : 'Preview'"
        :left-icon="isPreviewing ? 'fas fa-stop' : 'fas fa-play'"
        @click="togglePreview"
      />

      <div class="setting-group">
        <label class="setting-label">Demi-tons</label>
        <RangeSlider
          :model-value="semitones"
          :min="-12"
          :max="12"
          :step="1"
          :display-value="`${semitones > 0 ? '+' : ''}${semitones}`"
          @update:model-value="updateSemitones"
        />
      </div>

      <div class="setting-group">
        <label class="setting-label">Tune fin</label>
        <RangeSlider
          :model-value="cents"
          :min="-100"
          :max="100"
          :step="1"
          unit="¢"
          @update:model-value="updateCents"
        />
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
.sample-clip-edit-header {
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

.sample-clip-edit-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preview-btn {
  align-self: flex-start;
}

.setting-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 8px;
}
</style>
