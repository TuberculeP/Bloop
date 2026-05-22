<script setup lang="ts">
import { ref, computed } from "vue";
import type { DirectMessage } from "../../services/messages";
import { formatRelativeDate } from "../../lib/utils/dateFormatter";
import { likeMessage, unlikeMessage } from "../../services/messages";
import { useAuthStore } from "../../stores/authStore";

const props = defineProps<{
  message: DirectMessage;
  isOwn: boolean;
}>();

const emit = defineEmits<{
  messageLiked: [messageId: string];
  messageUnliked: [messageId: string];
}>();

const authStore = useAuthStore();
const isLiking = ref(false);

const currentUserLike = computed(() => {
  if (!props.message.likes || !authStore.user) return null;
  return props.message.likes.find(
    (like) => like.user.id === authStore.user?.id,
  );
});

const likeCount = computed(() => {
  return props.message.likes?.length ?? 0;
});

const handleLike = async () => {
  if (isLiking.value || currentUserLike.value) return;

  isLiking.value = true;
  const success = await likeMessage(props.message.id);
  isLiking.value = false;

  if (success && props.message.likes) {
    emit("messageLiked", props.message.id);
  }
};

const handleUnlike = async () => {
  if (isLiking.value || !currentUserLike.value) return;

  isLiking.value = true;
  const success = await unlikeMessage(props.message.id);
  isLiking.value = false;

  if (success) {
    emit("messageUnliked", props.message.id);
  }
};

const toggleLike = () => {
  if (currentUserLike.value) {
    handleUnlike();
  } else {
    handleLike();
  }
};
</script>

<template>
  <div class="message" :class="{ own: isOwn }">
    <div class="message-content">
      <p class="message-text">{{ message.body }}</p>
      <span class="message-time">{{
        formatRelativeDate(message.createdAt)
      }}</span>
      <div class="message-actions">
        <button
          v-if="!isOwn"
          class="like-button"
          :class="{ liked: currentUserLike }"
          @click="toggleLike"
          :disabled="isLiking"
          :title="currentUserLike ? 'Unlike' : 'Like'"
        >
          <span class="heart">{{ currentUserLike ? "❤️" : "Like" }}</span>
          <span v-if="likeCount > 0" class="like-count">{{ likeCount }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message {
  display: flex;
  max-width: 70%;
}

.message.own {
  align-self: flex-end;
}

/* ── Bulle de base ── */
.message-content {
  padding: 0.75rem 1rem;
  border-radius: 18px;
  color: var(--color-white);
  position: relative;
  transition: all 0.3s ease;
}

/* ── Message reçu ── */
.message:not(.own) .message-content {
  background: var(--color-bg-secondary-dark);
  border: 1px solid var(--color-border-secondary);
  border-bottom-left-radius: 4px;
}

.message:not(.own):hover .message-content {
  border-color: var(--color-accent3-hover);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* ── Message envoyé ── */
.message.own .message-content {
  background: var(--color-accent3);
  border-bottom-right-radius: 4px;
  box-shadow: 0 4px 15px rgba(122, 15, 62, 0.4);
}

.message.own:hover .message-content {
  background: var(--color-accent3-hover);
  box-shadow: 0 6px 20px rgba(155, 36, 88, 0.6);
  transform: translateY(-1px);
}

/* ── Texte ── */
.message-text {
  margin: 0 0 0.25rem 0;
  word-wrap: break-word;
  line-height: 1.4;
}

.message-time {
  font-size: 0.7rem;
  opacity: 0.6;
  display: block;
  text-align: right;
}

/* ── Actions ── */
.message-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
  gap: 0.5rem;
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

.like-button:hover:not(:disabled) {
  opacity: 1;
  border-color: var(--color-accent3-hover);
  background: rgba(122, 15, 62, 0.2);
}

.like-button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.like-button.liked {
  opacity: 1;
  border-color: var(--color-accent3-hover);
  background: rgba(122, 15, 62, 0.15);
}

.heart {
  font-size: 0.9rem;
}

.like-count {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-accent3-hover);
}
</style>
