<script setup lang="ts">
import { computed } from "vue";
import type { Conversation, MessageUser } from "../../services/messages";
import ConversationItem from "./ConversationItem.vue";
import UserSearchList from "./UserSearchList.vue";
import BaseSpinner from "../ui/BaseSpinner.vue";

const props = defineProps<{
  conversations: Conversation[];
  allUsers: MessageUser[];
  selectedUserId: string | null;
  loading: boolean;
  showNewConversation: boolean;
  userSearch: string;
}>();

const emit = defineEmits<{
  "update:showNewConversation": [value: boolean];
  "update:userSearch": [value: string];
  selectConversation: [user: MessageUser];
  startNewConversation: [user: MessageUser];
}>();

// Filtrer les utilisateurs pour nouvelle conversation
const filteredUsers = computed(() => {
  if (!props.allUsers) return [];
  return props.allUsers.filter(
    (u) =>
      u.firstName.toLowerCase().includes(props.userSearch.toLowerCase()) ||
      u.lastName.toLowerCase().includes(props.userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(props.userSearch.toLowerCase()),
  );
});

const toggleNewConversation = () => {
  emit("update:showNewConversation", !props.showNewConversation);
};

const handleUserSearch = (value: string) => {
  emit("update:userSearch", value);
};

const handleStartNewConversation = (user: MessageUser) => {
  emit("startNewConversation", user);
  emit("update:userSearch", "");
};
</script>

<template>
  <aside class="conversations-sidebar">
    <div class="sidebar-header">
      <h2 class="main-title">Messages</h2>
      <button
        class="btn-create btn-create--small"
        @click="toggleNewConversation"
      >
        <i class="fas fa-plus" />
      </button>
    </div>

    <UserSearchList
      v-if="showNewConversation"
      :users="filteredUsers"
      :search-query="userSearch"
      @update:search-query="handleUserSearch"
      @select="handleStartNewConversation"
    />

    <div v-if="loading" class="loading-state">
      <BaseSpinner size="large" color="accent3" />
    </div>
    <div v-else class="conversations-list">
      <ConversationItem
        v-for="conv in conversations"
        :key="conv.user.id"
        :conversation="conv"
        :is-active="selectedUserId === conv.user.id"
        @select="$emit('selectConversation', conv.user)"
      />
      <div
        v-if="!conversations || conversations.length === 0"
        class="no-conversations"
      >
        <div class="empty-illustration">
          <i class="fas fa-comments"></i>
        </div>
        <p>Aucune conversation</p>
        <p class="hint">Cliquez sur + pour démarrer</p>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.conversations-sidebar {
  width: 320px;
  border-right: 1px solid var(--color-border-secondary);
  display: flex;
  flex-direction: column;
  background: var(--color-bg-secondary-dark);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px 24px 16px;
}

.main-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-white);
  margin: 0;
  letter-spacing: -1px;
}

.btn-create {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent3);
  color: var(--color-white);
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(var(--color-accent3-rgb), 0.4);
}

.btn-create--small {
  width: 34px;
  height: 34px;
  font-size: 1rem;
}

.btn-create:hover {
  background: var(--color-accent3-hover);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(155, 36, 88, 0.6);
}

.conversations-list {
  padding: 12px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.no-conversations {
  text-align: center;
  padding: 2rem;
  color: var(--color-white-light);
  opacity: 0.7;
}

.empty-illustration {
  font-size: 2.5rem;
  margin-bottom: 12px;
  opacity: 0.5;
}

.no-conversations p {
  margin: 0;
  font-weight: 600;
  color: var(--color-white);
}

.hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
  font-weight: 400;
  color: var(--color-white-light);
  opacity: 0.6;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 2rem;
}

@media (max-width: 768px) {
  .conversations-sidebar {
    width: 100%;
    max-height: 300px;
  }
}
</style>
