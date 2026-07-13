<script setup lang="ts">
withDefaults(
  defineProps<{
    text: string;
    position?: "top" | "bottom";
  }>(),
  { position: "top" },
);
</script>

<template>
  <span class="base-tooltip-wrapper">
    <slot />
    <span class="base-tooltip" :class="`base-tooltip--${position}`">{{
      text
    }}</span>
  </span>
</template>

<style scoped>
.base-tooltip-wrapper {
  position: relative;
  display: inline-flex;
}

.base-tooltip {
  position: absolute;
  left: 50%;
  transform: translateX(-50%) scale(0.9);
  padding: 0.4rem 0.75rem;
  background: rgba(var(--color-landing-bg-rgb), 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  color: var(--color-white);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: all 0.2s ease;
  z-index: 10;
}

.base-tooltip--top {
  bottom: calc(100% + 8px);
}

.base-tooltip--bottom {
  top: calc(100% + 8px);
}

.base-tooltip-wrapper:hover .base-tooltip {
  opacity: 1;
  transform: translateX(-50%) scale(1);
}
</style>
