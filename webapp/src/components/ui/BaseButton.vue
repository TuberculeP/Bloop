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
export interface ButtonProps {
  variant?:
    | "primary"
    | "secondary"
    | "accent"
    | "accent2"
    | "error"
    | "link"
    | "ghost"
    | "lightghost"
    | "lightlink"
    | "outline"
    | "danger"
    | "success";
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
  box-shadow: 0 4px 12px rgba(var(--color-primary-hover-rgb), 0.3);
}

.base-button--secondary {
  background: var(--color-secondary);
  color: var(--color-primary);
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

.base-button--accent2 {
  background: var(--color-accent2);
  color: var(--color-white);
  border: 1px solid var(--color-accent2);
}

.base-button--accent2:hover:not(:disabled) {
  background: var(--color-accent2-hover);
  border-color: var(--color-accent2-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--color-accent2-rgb), 0.3);
}

.base-button--outline {
  background: transparent;
  color: var(--color-white);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.base-button--outline:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.base-button--danger {
  background: color-mix(in srgb, var(--color-status-error) 20%, transparent);
  color: var(--color-status-error);
  border: 1px solid transparent;
}

.base-button--danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-status-error) 30%, transparent);
}

.base-button--success {
  background: color-mix(in srgb, var(--color-status-success) 20%, transparent);
  color: var(--color-status-success);
  border: 1px solid transparent;
}

.base-button--success:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-status-success) 30%, transparent);
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
.base-button--lightlink {
  background: transparent;
  color: var(--color-accent);
  border: none;
  padding: 4px 8px;
  text-decoration: underline;
}

.base-button--lightlink:hover:not(:disabled) {
  color: var(--color-accent-hover);
  background: rgba(var(--color-accent-rgb), 0.1);
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
.base-button--lightghost {
  background: transparent;
  color: var(--color-accent);
  border: 1px solid var(--color-accent);
}

.base-button--lightghost:hover:not(:disabled) {
  background: var(--color-accent);
  color: var(--color-black);
  transform: translateY(-1px);
}

/* États */
.base-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  /* stylelint-disable declaration-no-important -- nécessaire : même spécificité que les règles :hover par variante (.base-button--primary:hover etc.), qui gagneraient sinon par ordre de déclaration */
  transform: none !important;
  box-shadow: none !important;
  /* stylelint-enable declaration-no-important */
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
