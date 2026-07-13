<script setup lang="ts">
export interface SpinnerProps {
  size?: "small" | "normal" | "large";
  color?: "primary" | "white" | "accent2" | "accent3";
}

withDefaults(defineProps<SpinnerProps>(), {
  size: "normal",
  color: "white",
});
</script>

<template>
  <span
    class="base-spinner"
    :class="[`base-spinner--${size}`, `base-spinner--${color}`]"
  />
</template>

<style scoped>
.base-spinner {
  display: inline-block;
  border-radius: var(--radius-full);
  border: 2px solid transparent;
  border-top-color: currentColor;
  animation: base-spinner-spin 0.8s linear infinite;
}

.base-spinner--small {
  width: 14px;
  height: 14px;
}

.base-spinner--normal {
  width: 22px;
  height: 22px;
}

.base-spinner--large {
  width: 32px;
  height: 32px;
  border-width: 3px;
}

.base-spinner--primary {
  color: var(--color-primary-hover);
}

.base-spinner--white {
  color: var(--color-white);
}

.base-spinner--accent2 {
  color: var(--color-accent2);
}

.base-spinner--accent3 {
  color: var(--color-accent3-hover);
}

@keyframes base-spinner-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
