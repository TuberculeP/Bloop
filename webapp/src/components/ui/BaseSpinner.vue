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
  <img
    src="../../assets/stan_waiting.svg"
    class="base-spinner"
    :class="`base-spinner--${size}`"
    alt=""
    aria-hidden="true"
  />
</template>

<style scoped>
.base-spinner {
  display: inline-block;
  object-fit: contain;
}

.base-spinner--small {
  width: 20px;
  height: 20px;
}

.base-spinner--normal {
  width: 32px;
  height: 32px;
}

.base-spinner--large {
  width: 48px;
  height: 48px;
}
</style>
