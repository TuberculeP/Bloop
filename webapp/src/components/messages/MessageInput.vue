<script setup lang="ts">
import BaseButton from "../ui/BaseButton.vue";

defineProps<{
  modelValue: string;
  sending: boolean;
}>();

defineEmits<{
  "update:modelValue": [value: string];
  send: [];
  typing: [];
}>();
</script>

<template>
  <div class="message-input-area">
    <input
      :value="modelValue"
      @input="
        $emit('update:modelValue', ($event.target as HTMLInputElement).value);
        $emit('typing');
      "
      type="text"
      placeholder="Écrivez un message..."
      class="message-input"
      @keypress.enter="$emit('send')"
      :disabled="sending"
    />
    <BaseButton
      variant="primary"
      size="normal"
      @click="$emit('send')"
      :loading="sending"
    >
      <i class="fas fa-paper-plane"></i>
    </BaseButton>
  </div>
</template>

<style scoped>
.message-input-area {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: var(--color-bg-secondary-dark);
}

.message-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border-secondary);
  border-radius: 24px;
  background: var(--bg-primary);
  font-size: 0.9rem;
}

.message-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}
</style>
