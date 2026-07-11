<script setup lang="ts">
export interface BadgeProps {
  variant?: "admin" | "active" | "featured" | "inactive" | "owner" | "neutral";
  size?: "small" | "normal";
}

withDefaults(defineProps<BadgeProps>(), {
  variant: "neutral",
  size: "normal",
});
</script>

<template>
  <span
    class="base-badge"
    :class="[`base-badge--${variant}`, `base-badge--${size}`]"
  >
    <slot />
  </span>
</template>

<style scoped>
.base-badge {
  display: inline-flex;
  align-items: center;
  border-radius: var(--radius-sm);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  white-space: nowrap;
}

.base-badge--normal {
  padding: 2px 8px;
  font-size: 11px;
}

.base-badge--small {
  padding: 1px 6px;
  font-size: 10px;
}

.base-badge--admin {
  background: color-mix(in srgb, var(--color-accent) 20%, transparent);
  color: var(--color-accent-hover);
}

.base-badge--active {
  background: color-mix(in srgb, var(--color-status-success) 20%, transparent);
  color: var(--color-status-success);
}

.base-badge--featured {
  background: color-mix(in srgb, var(--color-accent2) 20%, transparent);
  color: var(--color-accent2);
}

.base-badge--inactive {
  background: color-mix(in srgb, var(--color-status-error) 20%, transparent);
  color: var(--color-status-error);
}

.base-badge--owner {
  background: color-mix(in srgb, var(--color-secondary) 20%, transparent);
  color: var(--color-secondary);
}

.base-badge--neutral {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-white);
}
</style>
