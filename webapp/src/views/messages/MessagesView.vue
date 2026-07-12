<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useAuthStore } from "../../stores/authStore";
import { useMessages } from "../../lib/composables/useMessages";
import ConversationSidebar from "../../components/messages/ConversationSidebar.vue";
import MessageThread from "../../components/messages/MessageThread.vue";
import AppLayout from "../../layouts/AppLayout.vue";

const authStore = useAuthStore();

const {
  conversations,
  currentMessages,
  selectedUser,
  allUsers,
  showNewConversation,
  userSearch,
  isTyping,
  typingUser,
  newMessageText,
  loading,
  loadingMessages,
  sending,
  selectConversation,
  startNewConversation,
  handleSendMessage,
  handleTyping,
  handleToggleLike,
  handleDeleteMessage,
  init,
  cleanup,
} = useMessages();

onMounted(init);
onUnmounted(cleanup);
</script>

<template>
  <AppLayout>
    <div class="messages-container">
      <!-- Sidebar -->
      <ConversationSidebar
        :conversations="conversations"
        :all-users="allUsers"
        :selected-user-id="selectedUser?.id || null"
        :loading="loading"
        :show-new-conversation="showNewConversation"
        :user-search="userSearch"
        @update:show-new-conversation="showNewConversation = $event"
        @update:user-search="userSearch = $event"
        @select-conversation="selectConversation"
        @start-new-conversation="startNewConversation"
      />

      <!-- Zone de messages -->
      <main class="messages-area">
        <MessageThread
          v-if="selectedUser"
          :user="selectedUser"
          :messages="currentMessages"
          :current-user-id="authStore.user?.id || ''"
          :loading="loadingMessages"
          :sending="sending"
          :is-typing="isTyping"
          :typing-user="typingUser"
          v-model:message-text="newMessageText"
          @send="handleSendMessage"
          @typing="handleTyping"
          @toggle-like="handleToggleLike"
          @delete="handleDeleteMessage"
        />

        <!-- Aucune conversation sélectionnée -->
        <div v-else class="no-selection">
          <div class="no-selection-content">
            <i class="fas fa-comments no-selection-icon"></i>
            <h3>Sélectionnez une conversation</h3>
            <p>Choisissez une conversation ou démarrez-en une nouvelle</p>
          </div>
        </div>
      </main>
    </div>
  </AppLayout>
</template>

<style scoped>
.messages-container {
  display: flex;
  height: calc(100vh - 89px);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.messages-area {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.no-selection {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-white);
}

.no-selection-content {
  text-align: center;
}

.no-selection-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.3;
}

.no-selection h3 {
  margin-bottom: 0.5rem;
}

@media (max-width: 768px) {
  .messages-container {
    flex-direction: column;
    height: auto;
  }

  .messages-area {
    min-height: 400px;
  }
}
</style>
