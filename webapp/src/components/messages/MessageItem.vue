<script setup lang="ts">
import { computed } from "vue";
import type { DirectMessage } from "../../services/messages";
import { formatRelativeDate } from "../../lib/utils/dateFormatter";
import { useAuthStore } from "../../stores/authStore";

const props = defineProps<{
  message: DirectMessage;
  isOwn: boolean;
}>();

const emit = defineEmits<{
  toggleLike: [message: DirectMessage];
  delete: [messageId: string];
}>();

const authStore = useAuthStore();

const isMessageLiked = computed(() => {
  if (!props.message.likes || !authStore.user) return false;
  return props.message.likes.some(
    (like) => like.user.id === props.message?.receiver?.id,
  );
});

const currentUserLike = computed(() => {
  if (!props.message.likes || !authStore.user) return null;
  return props.message.likes.find(
    (like) => like.user.id === authStore.user?.id,
  );
});

const toggleLike = () => {
  emit("toggleLike", props.message);
};

const handleDelete = () => {
  emit("delete", props.message.id);
};
</script>

<template>
  <div class="message" :class="{ own: isOwn }">
    <div class="message-wrapper">
      <button
        v-if="isOwn"
        class="delete-button"
        @click="handleDelete"
        title="Supprimer le message"
      >
        <i class="fas fa-trash"></i>
      </button>
      <div class="message-content">
        <p class="message-text">{{ message.body }}</p>
      </div>
    </div>

    <span class="message-time">{{
      formatRelativeDate(message.createdAt)
    }}</span>

    <div class="message-actions">
      <i
        v-if="isOwn && isMessageLiked"
        class="fas fa-heart liked-indicator"
      ></i>

      <button
        v-else-if="!isOwn"
        class="like-button"
        :class="{ liked: currentUserLike }"
        @click="toggleLike"
        :title="currentUserLike ? 'Unlike' : 'Like'"
      >
        <i :class="currentUserLike ? 'fas fa-heart' : 'far fa-heart'"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.message {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 70%;
  width: fit-content;
}

.message.own {
  align-self: flex-end;
}

.message-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.message.own .message-wrapper {
  flex-direction: row-reverse;
}

.message-content {
  padding: 0.75rem 1rem;
  border-radius: 18px;
  color: var(--color-white);
  transition: all 0.3s ease;
  background: var(--color-border-secondary);
}

.message-actions {
  position: absolute;
  bottom: 0;
  right: 0;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: 50px;
  background: var(--color-bg-secondary-dark);
}

.message.own .message-actions {
  right: auto;
  left: 0;
}

.message-time {
  font-size: 0.7rem;
  opacity: 0.6;
  display: block;
  text-align: left;
}

.message.own .message-time {
  text-align: right;
}

.like-button {
  background: none;
  border: 1px solid transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  transition: all 0.2s ease;
  font-size: 0.85rem;
  opacity: 0.7;
  color: var(--color-white-light);
}

.like-button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.like-button.liked {
  opacity: 1;
  color: var(--color-accent3-hover);
}

.liked-indicator {
  font-size: 0.85rem;
  color: var(--color-accent3-hover);
  padding: 0.25rem 0.5rem;
}

/* ── Delete button ── */
.delete-button {
  background: none;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: var(--color-white-light);
  font-size: 0.8rem;
  opacity: 0;
  transform: scale(0.85);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
  flex-shrink: 0;
}

.message:hover .delete-button {
  opacity: 0.6;
  transform: scale(1);
}

.delete-button:hover {
  opacity: 1;
  background: rgba(224, 68, 92, 0.12);
  color: var(--color-error);
}

.delete-button:active {
  transform: scale(0.92);
}
</style>
