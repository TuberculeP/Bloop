<script setup lang="ts">
import { computed } from "vue";
import { useTimelineStore } from "../../../stores/timelineStore";
import RangeSlider from "../../ui/RangeSlider.vue";

const props = defineProps<{
  trackId: string; // "master" pour le bus master
  effectId: string; // "channel" pour le fader de volume (hors pile d'effets)
  paramId: string;
  label: string;
  unit?: string;
  min: number;
  max: number;
  step?: number;
  modelValue: number;
  displayValue?: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: number): void;
}>();

const timelineStore = useTimelineStore();

const lanes = computed(() =>
  props.trackId === "master"
    ? timelineStore.masterAutomationLanes
    : (timelineStore.tracks.find((t) => t.id === props.trackId)
        ?.automationLanes ?? []),
);

const automationLane = computed(() =>
  lanes.value.find(
    (l) =>
      l.target.trackId === props.trackId &&
      l.target.effectId === props.effectId &&
      l.target.paramId === props.paramId,
  ),
);

const isAutomated = computed(() => !!automationLane.value);

const toggleAutomation = () => {
  if (automationLane.value) {
    timelineStore.removeAutomationLane(props.trackId, automationLane.value.id);
  } else {
    const laneId = timelineStore.addAutomationLane({
      trackId: props.trackId,
      effectId: props.effectId,
      paramId: props.paramId,
    });
    // Point de départ à la valeur actuelle du paramètre (0.5 = centré pour
    // le pan) plutôt qu'une lane vide sans courbe visible.
    if (laneId) {
      const normalizedValue =
        (props.modelValue - props.min) / (props.max - props.min);
      timelineStore.addAutomationPoint(props.trackId, laneId, {
        x: 0,
        y: normalizedValue,
      });
    }
  }
};
</script>

<template>
  <div class="effect-param-row">
    <label class="param-label">
      <span>{{ label }}</span>
      <span v-if="isAutomated" class="auto-badge">AUTO</span>
      <button
        class="automate-btn"
        :class="{ active: isAutomated }"
        title="Automatiser ce paramètre"
        @click="toggleAutomation"
      >
        <svg
          width="11"
          height="9"
          viewBox="0 0 12 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 8 C2 8 2 2 4 2 C6 2 6 6 8 5 C10 4 10 2 12 2"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            fill="none"
          />
        </svg>
      </button>
    </label>
    <RangeSlider
      :model-value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :unit="unit"
      :display-value="displayValue"
      :disabled="isAutomated"
      @update:model-value="(v) => emit('update:modelValue', v)"
    />
  </div>
</template>

<style scoped lang="scss">
.effect-param-row {
  margin-bottom: 14px;

  &:last-child {
    margin-bottom: 0;
  }
}

.param-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 6px;
}

.auto-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(255, 63, 180, 0.2);
  color: var(--color-accent2);
  border: 1px solid rgba(255, 63, 180, 0.4);
  letter-spacing: 0.05em;
}

.automate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 1px solid rgba(var(--color-accent3-rgb), 0.3);
  border-radius: var(--radius-sm);
  background: transparent;
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.1s;

  &:hover {
    color: rgba(255, 255, 255, 0.6);
    border-color: rgba(255, 63, 180, 0.4);
  }

  &.active {
    color: var(--color-accent2);
    border-color: rgba(255, 63, 180, 0.6);
    background: rgba(255, 63, 180, 0.08);
  }
}
</style>
