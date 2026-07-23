<script setup lang="ts">
export interface InputProps {
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

withDefaults(defineProps<InputProps>(), {
  type: "text",
});

const model = defineModel<string | number>();
</script>

<template>
  <input
    :id="id"
    v-model="model"
    :type="type"
    :placeholder="placeholder"
    :required="required"
    :disabled="disabled"
    class="base-input"
  />
</template>

<style scoped>
.base-input {
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

.base-input::placeholder {
  color: var(--color-secondary);
  opacity: 0.7;
}

.base-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.base-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .base-input {
    font-size: 16px;
  }
}
</style>
