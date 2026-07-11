<script setup lang="ts">
export interface EmptyStateProps {
  icon?: string;
  title?: string;
  message?: string;
}

defineProps<EmptyStateProps>();
</script>

<template>
  <div class="empty-state">
    <i v-if="icon" :class="icon" class="empty-state__icon" />
    <p v-if="title" class="empty-state__title">{{ title }}</p>
    <p v-if="message" class="empty-state__message">{{ message }}</p>
    <slot />
    <div v-if="$slots.action" class="empty-state__action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
  color: var(--color-white);
  opacity: 0.7;
}

.empty-state__icon {
  font-size: 2rem;
  margin-bottom: 12px;
  opacity: 0.6;
}

.empty-state__title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 4px;
}

.empty-state__message {
  font-size: 0.9rem;
  margin: 0;
}

.empty-state__action {
  margin-top: 16px;
}
</style>
