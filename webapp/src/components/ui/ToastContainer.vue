<script setup lang="ts">
import { useToast } from "../../composables/useToast";

const { toasts, dismiss } = useToast();

const iconFor = (type: string) => {
  if (type === "success") return "fas fa-circle-check";
  if (type === "error") return "fas fa-circle-exclamation";
  return "fas fa-circle-info";
};
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="`toast--${toast.type}`"
          @click="dismiss(toast.id)"
        >
          <i :class="iconFor(toast.type)" />
          <span>{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 360px;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  color: var(--color-white);
  cursor: pointer;
  font-size: 0.9rem;
}

.toast--success {
  background: var(--color-bg-success-dark);
  border: 1px solid var(--color-success);
}

.toast--error {
  background: var(--color-bg-error-dark);
  border: 1px solid var(--color-error);
}

.toast--info {
  background: var(--color-bg-secondary-dark);
  border: 1px solid var(--color-border-secondary);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
