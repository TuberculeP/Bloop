<script setup lang="ts">
defineProps<{
  label?: string;
  htmlFor?: string;
  error?: string;
}>();
</script>

<template>
  <div class="form-field">
    <label v-if="label" :for="htmlFor">{{ label }}</label>
    <slot />
    <p v-if="error" class="form-field__error">{{ error }}</p>
  </div>
</template>

<style scoped>
.form-field {
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
}

.form-field label {
  display: block;
  color: var(--color-white);
  font-weight: 500;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.form-field__error {
  color: var(--color-error);
  font-size: 0.85rem;
  margin: 6px 0 0;
}
</style>
