<script setup lang="ts">
import { computed } from "vue";
import type { InstrumentParamMeta } from "../../../lib/audio/instruments";
import RangeSlider from "../../ui/RangeSlider.vue";

const props = defineProps<{
  meta: InstrumentParamMeta;
  modelValue: number | string;
  dynamicOptions?: { value: string; label: string }[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: number | string): void;
}>();

const options = computed(() => {
  if (props.meta.kind !== "enum") return [];
  return props.meta.options === "dynamic"
    ? (props.dynamicOptions ?? [])
    : props.meta.options;
});

const displayValue = computed(() => {
  if (props.meta.kind !== "number") return "";
  const value = Number(props.modelValue);
  return props.meta.toDisplay
    ? props.meta.toDisplay(value)
    : `${value}${props.meta.unit ?? ""}`;
});

const onNumberChange = (value: number) => emit("update:modelValue", value);
const onEnumChange = (event: Event) => {
  emit("update:modelValue", (event.target as HTMLSelectElement).value);
};
</script>

<template>
  <div class="param-field">
    <label class="param-label">{{ meta.label }}</label>

    <RangeSlider
      v-if="meta.kind === 'number'"
      :model-value="Number(modelValue)"
      :min="meta.min"
      :max="meta.max"
      :step="meta.step"
      thumb-size="small"
      :display-value="displayValue"
      @update:model-value="onNumberChange"
    />

    <template v-else>
      <p v-if="meta.options === 'dynamic' && loading" class="loading-text">
        Chargement...
      </p>
      <p v-else-if="options.length === 0" class="coming-soon">
        Aucune option disponible
      </p>
      <select
        v-else
        class="param-select"
        :value="modelValue"
        @change="onEnumChange"
      >
        <option v-for="opt in options" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </template>
  </div>
</template>

<style scoped lang="scss">
.param-field {
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }
}

.param-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 8px;
}

.param-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border-secondary);
  border-radius: 6px;
  background: var(--color-bg-primary-dark);
  color: var(--color-white);
  font-size: 13px;
  cursor: pointer;
  color-scheme: dark;

  &:focus {
    outline: none;
    border-color: var(--color-accent2);
  }

  option {
    background: var(--color-bg-secondary-dark);
    text-transform: capitalize;
  }
}

.coming-soon,
.loading-text {
  font-size: 13px;
  font-style: italic;
  color: rgba(255, 255, 255, 0.6);
}

.loading-text {
  color: var(--color-accent2);
}
</style>
