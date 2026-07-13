<script setup lang="ts">
import { ref, nextTick, watch } from "vue";
import type { DirectMessage, MessageUser } from "../../services/messages";
import MessageItem from "./MessageItem.vue";
import MessageInput from "./MessageInput.vue";
import BaseSpinner from "../ui/BaseSpinner.vue";

const props = defineProps<{
  user: MessageUser;
  messages: DirectMessage[];
  currentUserId: string;
  loading: boolean;
  sending: boolean;
  isTyping: boolean;
  typingUser: string | null;
}>();

const newMessageText = defineModel<string>("messageText", { default: "" });

defineEmits<{
  send: [];
  typing: [];
  toggleLike: [message: DirectMessage];
  delete: [messageId: string];
}>();

const messagesContainer = ref<HTMLElement | null>(null);

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const isOwnMessage = (message: DirectMessage) => {
  return message.sender.id === props.currentUserId;
};

// Scroll automatique quand les messages changent
watch(
  () => props.messages.length,
  async () => {
    await nextTick();
    scrollToBottom();
  },
);

defineExpose({ scrollToBottom });
</script>

<template>
  <div class="message-thread">
    <div class="messages-header">
      <div class="header-user">
        <div class="header-avatar">
          {{ user.firstName[0] }}{{ user.lastName[0] }}
        </div>
        <div class="header-info">
          <span class="header-name"
            >{{ user.firstName }} {{ user.lastName }}</span
          >
        </div>
      </div>
    </div>

    <div ref="messagesContainer" class="messages-list">
      <div v-if="loading" class="loading-messages">
        <BaseSpinner size="large" color="accent3" />
      </div>
      <template v-else>
        <MessageItem
          v-for="message in messages"
          :key="message.id"
          :message="message"
          :is-own="isOwnMessage(message)"
          @toggle-like="$emit('toggleLike', $event)"
          @delete="$emit('delete', $event)"
        />
        <div v-if="!messages || messages.length === 0" class="no-messages">
          <i class="fa fa-comments empty-illustration"></i>
          <p>Aucun message</p>
          <p class="hint">Envoyez le premier message !</p>
        </div>
        <div v-if="isTyping" class="typing-indicator">
          <span class="typing-dots">
            <span></span><span></span><span></span>
          </span>
          <span class="typing-text">{{ typingUser }} écrit...</span>
        </div>
      </template>
    </div>

    <MessageInput
      v-model="newMessageText"
      :sending="sending"
      @send="$emit('send')"
      @typing="$emit('typing')"
    />
  </div>
</template>

<style scoped>
.message-thread {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-bg-secondary-dark);
}

/* ── Header ── */
.messages-header {
  padding: 12px 16px;
  transition: background 0.3s ease;
  border-bottom: 1px solid var(--color-border-secondary);
}

.header-user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--color-accent3);
  color: var(--color-white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(var(--color-accent3-rgb), 0.4);
}

.header-info {
  display: flex;
  flex-direction: column;
}

.header-name {
  font-weight: 700;
  color: var(--color-white);
  font-size: 1rem;
}

.header-email {
  font-size: 0.75rem;
  color: var(--color-white-light);
  opacity: 0.6;
}

/* ── Messages ── */
.messages-list {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.no-messages {
  text-align: center;
  margin: auto;
  color: var(--color-white-light);
  opacity: 0.7;
}

.empty-illustration {
  font-size: 3rem;
  margin-bottom: 12px;
  opacity: 0.4;
}

.no-messages p {
  margin: 0;
  font-weight: 600;
  color: var(--color-white);
}

.hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
  font-weight: 400;
  opacity: 0.6;
}

/* ── Loading ── */
.loading-messages {
  display: flex;
  justify-content: center;
  padding: 2rem;
}

/* ── Typing indicator ── */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: var(--color-white-light);
  opacity: 0.7;
}

.typing-dots {
  display: flex;
  gap: 3px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent3-hover);
  animation: typing-bounce 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) {
  animation-delay: 0s;
}
.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}
.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-4px);
  }
}

.typing-text {
  font-style: italic;
}
</style>
