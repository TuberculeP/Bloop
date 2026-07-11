<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";

export interface ModalProps {
  modelValue: boolean;
  size?: "small" | "normal" | "large";
  closeOnOverlayClick?: boolean;
}

const props = withDefaults(defineProps<ModalProps>(), {
  size: "normal",
  closeOnOverlayClick: true,
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const close = () => emit("update:modelValue", false);

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape" && props.modelValue) close();
};

onMounted(() => document.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));
</script>

<template>
  <Teleport to="body">
    <Transition name="base-modal-fade">
      <div
        v-if="modelValue"
        class="base-modal-overlay"
        @click="closeOnOverlayClick && close()"
      >
        <div class="base-modal" :class="`base-modal--${size}`" @click.stop>
          <div v-if="$slots.header" class="base-modal__header">
            <slot name="header" />
          </div>
          <div class="base-modal__body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="base-modal__footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.base-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
}

.base-modal {
  background: var(--color-bg-secondary-dark);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-lg);
  padding: 24px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.base-modal--small {
  max-width: 360px;
}

.base-modal--normal {
  max-width: 460px;
}

.base-modal--large {
  max-width: 640px;
}

.base-modal__header {
  margin-bottom: 16px;
}

.base-modal__header :deep(h2),
.base-modal__header :deep(h3) {
  margin: 0;
  color: var(--color-white);
}

.base-modal__footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.base-modal-fade-enter-active,
.base-modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.base-modal-fade-enter-from,
.base-modal-fade-leave-to {
  opacity: 0;
}
</style>
