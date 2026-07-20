<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    to?: string;
    size?: "normal" | "compact";
  }>(),
  { size: "normal" },
);

const emit = defineEmits<{
  click: [MouseEvent];
}>();

const tag = computed(() => (props.to ? "router-link" : "button"));
</script>

<template>
  <component
    :is="tag"
    :to="to"
    class="landing-cta-button"
    :class="`landing-cta-button--${size}`"
    @click="(e: MouseEvent) => emit('click', e)"
  >
    <span class="landing-cta-button__shine" />
    <span class="landing-cta-button__content"><slot /></span>
  </component>
</template>

<style scoped>
.landing-cta-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  background: linear-gradient(
    135deg,
    var(--color-accent) 0%,
    var(--color-accent2) 100%
  );
  color: var(--color-black);
  text-decoration: none;
  font-weight: 600;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.landing-cta-button--normal {
  padding: 1rem 2rem;
  font-size: 1rem;
}

.landing-cta-button--compact {
  padding: 0.6rem 1.5rem;
  font-size: 0.9rem;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 15px rgba(255, 210, 105, 0.3);
}

.landing-cta-button:hover {
  transform: translateY(-2px);
}

.landing-cta-button--normal:hover {
  box-shadow: 0 8px 30px rgba(255, 210, 105, 0.4);
}

.landing-cta-button--compact:hover {
  box-shadow: 0 6px 25px rgba(255, 210, 105, 0.4);
}

.landing-cta-button__shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent
  );
  transition: left 0.5s ease;
}

.landing-cta-button:hover .landing-cta-button__shine {
  left: 100%;
}

.landing-cta-button__content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
