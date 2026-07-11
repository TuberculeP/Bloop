<script setup lang="ts">
export interface SelectOption {
  value: string;
  label: string;
}

defineProps<{
  options: SelectOption[];
  disabled?: boolean;
  id?: string;
}>();

const model = defineModel<string>();
</script>

<template>
  <select :id="id" v-model="model" :disabled="disabled" class="base-select">
    <option v-for="opt in options" :key="opt.value" :value="opt.value">
      {{ opt.label }}
    </option>
  </select>
</template>

<style scoped>
.base-select {
  width: 100%;
  padding: 12px 16px;
  background-color: var(--color-bg-secondary-dark);
  border: 1px solid var(--color-black);
  border-radius: var(--radius-md);
  color: var(--color-white);
  font-family: inherit;
  font-size: 0.9rem;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.base-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.base-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
