<script setup lang="ts">
import type { Conversation } from "../../services/messages";
import { formatRelativeDate } from "../../lib/utils/dateFormatter";

defineProps<{
  conversation: Conversation;
  isActive: boolean;
}>();

defineEmits<{
  select: [];
}>();
</script>

<template>
  <div
    class="conversation-item"
    :class="{ active: isActive }"
    @click="$emit('select')"
  >
    <div class="conversation-avatar">
      {{ conversation.user.firstName[0] }}{{ conversation.user.lastName[0] }}
    </div>
    <div class="conversation-info">
      <div class="conversation-header">
        <span class="conversation-name">
          {{ conversation.user.firstName }} {{ conversation.user.lastName }}
        </span>
        <span class="conversation-time">
          {{ formatRelativeDate(conversation.lastMessage.createdAt) }}
        </span>
      </div>
      <div class="conversation-preview">
        <span class="preview-text">
          {{ conversation.lastMessage.body.substring(0, 40) }}
          {{ conversation.lastMessage.body.length > 40 ? "..." : "" }}
        </span>
        <span v-if="conversation.unreadCount > 0" class="unread-badge">
          {{ conversation.unreadCount }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.conversation-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  cursor: pointer;
  transition: background 0.2s;
  border-radius: 8px;
}

.conversation-item:hover {
  background: var(--color-primary-hover);
}

.conversation-item.active {
  background: var(--color-primary-hover);
}

.conversation-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-primary-hover);
  box-shadow: 0 4px 15px rgba(var(--color-accent3-rgb), 0.4);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.conversation-name {
  font-weight: 500;
  color: var(--color-white);
}

.conversation-time {
  font-size: 0.75rem;
}

.conversation-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-text {
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.unread-badge {
  background: var(--color-error);
  color: white;
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
  font-weight: 600;
}
</style>
