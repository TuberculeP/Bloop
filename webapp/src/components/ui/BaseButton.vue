<template>
  <button
    :class="[
      'base-button',
      `base-button--${variant}`,
      `base-button--${size}`,
      {
        'base-button--disabled': disabled,
        'base-button--loading': loading,
      },
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="base-button__spinner">⟳</span>
    <slot v-else />
  </button>
</template>

<script setup lang="ts">
import { defineEmits } from "vue";

export interface ButtonProps {
  variant?: "primary" | "secondary" | "accent" | "error" | "link" | "ghost";
  size?: "small" | "normal" | "large";
  disabled?: boolean;
  loading?: boolean;
}

withDefaults(defineProps<ButtonProps>(), {
  variant: "primary",
  size: "normal",
  disabled: false,
  loading: false,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const handleClick = (event: MouseEvent) => {
  emit("click", event);
};
</script>

<style scoped>
.base-button {
  border: none;
  border-radius: 12px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-decoration: none;
  outline: none;
  box-sizing: border-box;
}

/* Tailles */
.base-button--small {
  padding: 6px 12px;
  font-size: 0.8rem;
  min-height: 28px;
}

.base-button--normal {
  padding: 8px 16px;
  font-size: 0.9rem;
  min-height: 36px;
}

.base-button--large {
  padding: 12px 24px;
  font-size: 1rem;
  min-height: 44px;
}

/* Variantes */
.base-button--primary {
  background: var(--color-primary-hover);
  color: var(--color-white);
  border: 1px solid var(--color-primary-hover);
}

.base-button--primary:hover:not(:disabled) {
  background: var(--color-primary);
  border-color: var(--color-primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--color-primary-hover), 0.3);
}

.base-button--secondary {
  background: var(--color-secondary);
  color: var(--color-white);
  border: 1px solid var(--color-secondary);
}

.base-button--secondary:hover:not(:disabled) {
  background: var(--color-secondary-hover);
  border-color: var(--color-secondary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--color-secondary-rgb), 0.3);
}

.base-button--accent {
  background: var(--color-accent);
  color: var(--color-black);
  border: 1px solid var(--color-accent);
}

.base-button--accent:hover:not(:disabled) {
  background: var(--color-accent);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px
    color-mix(in srgb, var(--color-secondary) 40%, transparent);
  filter: brightness(1.1);
}

.base-button--error {
  background: var(--color-error);
  color: var(--color-white);
  border: 1px solid var(--color-error);
}

.base-button--error:hover:not(:disabled) {
  background: var(--color-error-hover);
  border-color: var(--color-error-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--color-error-rgb), 0.3);
}

.base-button--link {
  background: transparent;
  color: var(--color-primary);
  border: none;
  padding: 4px 8px;
  text-decoration: underline;
}

.base-button--link:hover:not(:disabled) {
  color: var(--color-primary-hover);
  background: rgba(var(--color-primary-rgb), 0.1);
}

.base-button--ghost {
  background: transparent;
  color: var(--color-accent3);
  border: 1px solid var(--color-accent3);
}

.base-button--ghost:hover:not(:disabled) {
  background: var(--color-accent3);
  color: var(--color-white);
  transform: translateY(-1px);
}

/* États */
.base-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.base-button--loading {
  cursor: not-allowed;
}

.base-button__spinner {
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Focus styles */
.base-button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
