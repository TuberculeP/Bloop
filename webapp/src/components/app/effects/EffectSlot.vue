<script setup lang="ts">
import { ref, computed } from "vue";
import type { EffectInstanceConfig, EQBand } from "../../../lib/utils/types";
import { getEffectDefinition } from "../../../lib/audio/effects";
import { DEFAULT_EQ_BANDS } from "../../../lib/audio/config";
import TrackEqualizer from "../instruments/TrackEqualizer.vue";
import EffectParamRow from "./EffectParamRow.vue";

const props = defineProps<{
  trackId: string; // "master" pour le bus master
  effect: EffectInstanceConfig;
  index: number;
}>();

const emit = defineEmits<{
  (e: "remove"): void;
  (e: "toggle", enabled: boolean): void;
  (e: "update-param", paramId: string, value: number): void;
  (e: "drag-start", index: number): void;
  (e: "drag-over", index: number): void;
  (e: "drop", index: number): void;
}>();

const expanded = ref(false);

const definition = computed(() => getEffectDefinition(props.effect.type));

const isEQ = computed(() => props.effect.type === "eq5");

const eqBands = computed<EQBand[]>(() =>
  DEFAULT_EQ_BANDS.map((band) => ({
    ...band,
    gain: props.effect.params[`${band.id}_gain`] ?? 0,
  })),
);

const handleEQUpdate = (bandId: string, gain: number) => {
  emit("update-param", `${bandId}_gain`, gain);
};
</script>

<template>
  <div class="effect-slot" :class="{ disabled: !effect.enabled }">
    <div class="effect-slot-header">
      <span
        class="drag-handle"
        draggable="true"
        title="Réordonner"
        @dragstart="emit('drag-start', index)"
        @dragover.prevent="emit('drag-over', index)"
        @drop="emit('drop', index)"
        >⠿</span
      >
      <button
        class="expand-btn"
        :class="{ expanded }"
        @click="expanded = !expanded"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path
            d="M1 2.5L4 5.5L7 2.5"
            stroke="currentColor"
            stroke-width="1.3"
            stroke-linecap="round"
          />
        </svg>
      </button>
      <span class="effect-name">{{ definition?.label ?? effect.type }}</span>
      <label class="bypass-toggle" title="Bypass">
        <input
          type="checkbox"
          :checked="effect.enabled"
          @change="emit('toggle', ($event.target as HTMLInputElement).checked)"
        />
      </label>
      <button class="remove-btn" title="Supprimer" @click="emit('remove')">
        <i class="fas fa-times" />
      </button>
    </div>

    <div v-if="expanded" class="effect-slot-body">
      <TrackEqualizer v-if="isEQ" :bands="eqBands" @update="handleEQUpdate" />
      <EffectParamRow
        v-for="param in definition?.params ?? []"
        v-else
        :key="param.id"
        :track-id="trackId"
        :effect-id="effect.id"
        :param-id="param.id"
        :label="param.label"
        :unit="param.unit"
        :min="param.min"
        :max="param.max"
        :step="param.step"
        :options="param.options"
        :model-value="effect.params[param.id] ?? param.defaultValue"
        :display-value="
          param.toDisplay?.(effect.params[param.id] ?? param.defaultValue)
        "
        @update:model-value="(v) => emit('update-param', param.id, v)"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.effect-slot {
  border: 1px solid var(--color-border-secondary);
  border-radius: 6px;
  margin-bottom: 8px;
  background: var(--color-bg-primary-dark);
  overflow: hidden;

  &.disabled {
    opacity: 0.5;
  }
}

.effect-slot-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
}

.drag-handle {
  cursor: grab;
  color: rgba(255, 255, 255, 0.3);
  font-size: 13px;
  line-height: 1;
  user-select: none;

  &:active {
    cursor: grabbing;
  }
}

.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: transform 0.15s;

  &.expanded {
    transform: rotate(180deg);
  }
}

.effect-name {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-white);
}

.bypass-toggle input {
  cursor: pointer;
}

.remove-btn {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: rgba(255, 255, 255, 0.3);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  padding: 0;

  &:hover {
    color: var(--color-status-error);
    background: rgba(var(--color-status-error-rgb), 0.1);
  }
}

.effect-slot-body {
  padding: 12px;
  border-top: 1px solid var(--color-border-secondary);
}
</style>
