<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
}

const props = withDefaults(defineProps<ConfirmModalProps>(), {
  confirmText: "Confirmer",
  cancelText: "Annuler",
  variant: "default",
});

const emit = defineEmits<{
  (e: "confirm"): void;
  (e: "cancel"): void;
}>();

const cancelButtonRef = ref<HTMLButtonElement | null>(null);

const handleConfirm = () => {
  emit("confirm");
};

const handleCancel = () => {
  emit("cancel");
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape") {
    handleCancel();
  }
};

watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      document.addEventListener("keydown", handleKeydown);
      setTimeout(() => {
        cancelButtonRef.value?.focus();
      }, 50);
    } else {
      document.removeEventListener("keydown", handleKeydown);
    }
  },
);

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        class="confirm-modal-overlay"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title"
        @click.self="handleCancel"
      >
        <div class="confirm-modal">
          <h3 class="confirm-modal__title">{{ title }}</h3>
          <p class="confirm-modal__message">{{ message }}</p>
          <div class="confirm-modal__actions">
            <button
              ref="cancelButtonRef"
              class="confirm-modal__btn confirm-modal__btn--cancel"
              @click="handleCancel"
            >
              {{ cancelText }}
            </button>
            <button
              class="confirm-modal__btn"
              :class="`confirm-modal__btn--${variant}`"
              @click="handleConfirm"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.confirm-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.confirm-modal {
  background: #2d0f20;
  border-radius: 12px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);

  &__title {
    margin: 0 0 12px;
    font-size: 18px;
    font-weight: 600;
    color: #f2efe8;
  }

  &__message {
    margin: 0 0 24px;
    font-size: 14px;
    color: rgba(242, 239, 232, 0.8);
    line-height: 1.5;
  }

  &__actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  &__btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    &--cancel {
      background: rgba(255, 255, 255, 0.1);
      color: #f2efe8;

      &:hover {
        background: rgba(255, 255, 255, 0.15);
      }
    }

    &--default {
      background: #ff3fb4;
      color: #1a0e15;

      &:hover {
        background: #ff5fc4;
      }
    }

    &--warning {
      background: #ffa500;
      color: #1a0e15;

      &:hover {
        background: #ffb833;
      }
    }

    &--danger {
      background: #d7266d;
      color: #f2efe8;

      &:hover {
        background: #e83d7f;
      }
    }

    &:focus-visible {
      outline: 2px solid #ff3fb4;
      outline-offset: 2px;
    }
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
