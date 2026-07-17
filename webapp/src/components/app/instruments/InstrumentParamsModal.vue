<script setup lang="ts">
import { computed } from "vue";
import type { Track } from "../../../lib/utils/types";
import { useTimelineStore } from "../../../stores/timelineStore";
import { useTrackAudioStore } from "../../../stores/trackAudioStore";
import { getInstrumentDefinition } from "../../../lib/audio/instruments";
import BaseModal from "../../ui/BaseModal.vue";
import BaseButton from "../../ui/BaseButton.vue";
import InstrumentParamField from "./InstrumentParamField.vue";

const props = defineProps<{
  track: Track;
  modelValue: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const timelineStore = useTimelineStore();
const trackAudioStore = useTrackAudioStore();

const definition = computed(() =>
  getInstrumentDefinition(props.track.instrument.type),
);

const engineState = computed(() =>
  trackAudioStore.getTrackEngineState(props.track.id),
);

const getParamValue = (paramId: string, fallback: number | string) => {
  const value = props.track.instrument[paramId];
  return typeof value === "number" || typeof value === "string"
    ? value
    : fallback;
};

const getDynamicOptions = (paramId: string) => {
  return trackAudioStore.getEngine(props.track.id)?.getParamOptions?.(paramId);
};

const handleParamChange = (paramId: string, value: number | string) => {
  timelineStore.updateTrackInstrument(props.track.id, { [paramId]: value });
  trackAudioStore.updateTrackInstrument(props.track.id, { [paramId]: value });
};

const handleClose = () => emit("update:modelValue", false);
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    size="large"
    modal-class="instrument-params-modal"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <template #header>
      <h3>
        <span v-if="definition?.icon">{{ definition.icon }}</span>
        {{ definition?.label ?? "Instrument" }}
      </h3>
    </template>

    <div v-if="definition && definition.params.length > 0" class="params-list">
      <InstrumentParamField
        v-for="meta in definition.params"
        :key="meta.id"
        :meta="meta"
        :model-value="getParamValue(meta.id, meta.defaultValue)"
        :dynamic-options="
          meta.kind === 'enum' && meta.options === 'dynamic'
            ? getDynamicOptions(meta.id)
            : undefined
        "
        :loading="
          meta.kind === 'enum' &&
          meta.options === 'dynamic' &&
          engineState === 'loading'
        "
        @update:model-value="(value) => handleParamChange(meta.id, value)"
      />
    </div>
    <p v-else class="coming-soon">
      Paramètres non disponibles pour cet instrument.
    </p>

    <template #footer>
      <BaseButton
        class="close-instrument-params-btn"
        variant="secondary"
        @click="handleClose"
      >
        Fermer
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.coming-soon {
  font-size: 13px;
  font-style: italic;
  color: rgba(255, 255, 255, 0.6);
}
</style>
