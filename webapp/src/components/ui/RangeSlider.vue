<script setup lang="ts">
export interface RangeSliderProps {
  modelValue: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  displayValue?: string;
  disabled?: boolean;
  thumbSize?: "small" | "normal";
}

withDefaults(defineProps<RangeSliderProps>(), {
  step: 1,
  unit: "",
  thumbSize: "normal",
});

const emit = defineEmits<{
  "update:modelValue": [value: number];
}>();

const onInput = (event: Event) => {
  emit("update:modelValue", Number((event.target as HTMLInputElement).value));
};
</script>

<template>
  <div class="range-slider" :class="{ 'range-slider--disabled': disabled }">
    <input
      type="range"
      class="range-slider__input"
      :class="`range-slider__input--${thumbSize}`"
      :value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      @input="onInput"
    />
    <span class="range-slider__value">{{
      displayValue ?? `${modelValue}${unit}`
    }}</span>
  </div>
</template>

<style scoped>
.range-slider {
  display: flex;
  align-items: center;
  gap: 12px;
}

.range-slider--disabled {
  opacity: 0.4;
  pointer-events: none;
}

.range-slider__input {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  background: var(--color-accent3);
  border-radius: var(--radius-sm);
}

.range-slider__input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: var(--color-accent2);
  border-radius: var(--radius-full);
  cursor: pointer;
}

.range-slider__input--small::-webkit-slider-thumb {
  width: 14px;
  height: 14px;
}

.range-slider__value {
  font-size: 13px;
  color: var(--color-white);
  min-width: 45px;
  text-align: right;
}
</style>
