import { ref } from "vue";
import { useAuthStore } from "../../stores/authStore";
import {
  getConversations,
  getConversationMessages,
  getUsers,
  sendMessage as sendMessageAPI,
  type Conversation,
  type DirectMessage,
  type MessageUser,
  unlikeMessage,
  likeMessage,
  deleteMessage,
} from "../../services/messages";
import {
  onSocketConnected,
  onSocketEvent,
  getSocket,
} from "../utils/websocket";

/**
 * Composable pour gérer la logique des messages
 */
export function useMessages() {
  const authStore = useAuthStore();
  const socket = getSocket();

  // État
  const conversations = ref<Conversation[]>([]);
  const currentMessages = ref<DirectMessage[]>([]);
  const selectedUser = ref<MessageUser | null>(null);
  const allUsers = ref<MessageUser[]>([]);
  const showNewConversation = ref(false);
  const userSearch = ref("");
  const isTyping = ref(false);
  const typingUser = ref<string | null>(null);
  const newMessageText = ref("");
  const loading = ref(true);
  const loadingMessages = ref(false);
  const sending = ref(false);

  // Subscriptions
  let unsubscribeNewMessage: (() => void) | null = null;
  let unsubscribeSent: (() => void) | null = null;
  let unsubscribeTyping: (() => void) | null = null;
  let unsubscribeLiked: (() => void) | null = null;
  let unsubscribeUnliked: (() => void) | null = null;
  let typingTimeout: ReturnType<typeof setTimeout> | null = null;
  let unsubscribeDeleted: (() => void) | null = null;

  // Charger les conversations
  const loadConversations = async () => {
    try {
      loading.value = true;
      conversations.value = await getConversations();
    } catch (error) {
      console.error("Erreur chargement conversations:", error);
    } finally {
      loading.value = false;
    }
  };

  // Charger les utilisateurs
  const loadUsers = async () => {
    allUsers.value = await getUsers();
  };

  // Sélectionner ou fermer une conversation
  const selectConversation = async (user: MessageUser) => {
    if (selectedUser.value?.id === user.id) {
      selectedUser.value = null;
      currentMessages.value = [];
      return;
    }

    selectedUser.value = user;
    showNewConversation.value = false;
    loadingMessages.value = true;

    // Retirer immédiatement le badge non lu
    const conversation = conversations.value.find((c) => c.user.id === user.id);
    if (conversation) {
      conversation.unreadCount = 0;
    }

    try {
      currentMessages.value = await getConversationMessages(user.id);

      // Notifier le serveur que les messages sont lus
      if (socket.connected && authStore.user?.id) {
        socket.emit("messages:markRead", {
          conversationUserId: user.id,
          currentUserId: authStore.user.id,
        });
      }
    } catch (error) {
      console.error("Erreur chargement messages:", error);
    } finally {
      loadingMessages.value = false;
    }
  };

  // Démarrer une nouvelle conversation
  const startNewConversation = (user: MessageUser) => {
    selectedUser.value = user;
    currentMessages.value = [];
    showNewConversation.value = false;
    userSearch.value = "";
  };

  // Envoyer un message
  const handleSendMessage = async () => {
    if (!selectedUser.value || !newMessageText.value.trim()) return;

    sending.value = true;
    const messageBody = newMessageText.value.trim();

    try {
      if (socket.connected) {
        socket.emit("messages:send", {
          senderId: authStore.user?.id,
          receiverId: selectedUser.value.id,
          body: messageBody,
        });
      } else {
        const message = await sendMessageAPI(
          selectedUser.value.id,
          messageBody,
        );
        if (message && currentMessages.value) {
          currentMessages.value.push(message);
          await loadConversations();
        }
      }

      newMessageText.value = "";
      stopTyping();
    } catch (error) {
      console.error("Erreur envoi message:", error);
    } finally {
      sending.value = false;
    }
  };

  // Arrêter l'indicateur de frappe
  const stopTyping = () => {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      typingTimeout = null;
    }
    if (socket.connected && selectedUser.value) {
      socket.emit("messages:typing", {
        senderId: authStore.user?.id,
        receiverId: selectedUser.value.id,
        isTyping: false,
      });
    }
  };

  // Gérer les likes d'un message
  const handleTyping = () => {
    if (!selectedUser.value || !socket.connected) return;

    socket.emit("messages:typing", {
      senderId: authStore.user?.id,
      receiverId: selectedUser.value.id,
      isTyping: true,
    });

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    typingTimeout = setTimeout(stopTyping, 2000);
  };

  // Toggle like/unlike sur un message
  const handleToggleLike = async (message: DirectMessage) => {
    if (!authStore.user) return;

    const existingLike = message.likes?.find(
      (like) => like.user.id === authStore.user!.id,
    );

    if (existingLike) {
      const likes = message.likes!;
      const index = likes.indexOf(existingLike);
      likes.splice(index, 1);

      const success = await unlikeMessage(message.id);
      if (!success) {
        likes.splice(index, 0, existingLike);
      }
    } else {
      const optimisticLike = {
        id: `temp-${Date.now()}`,
        user: { id: authStore.user.id },
      } as any;

      message.likes = message.likes || [];
      message.likes.push(optimisticLike);

      const success = await likeMessage(message.id);
      if (!success) {
        // rollback si échec
        const idx = message.likes.indexOf(optimisticLike);
        if (idx !== -1) message.likes.splice(idx, 1);
      }
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const index = currentMessages.value.findIndex((m) => m.id === messageId);
    if (index === -1) return;

    // Suppression optimiste : on retire immédiatement du tableau
    const [removed] = currentMessages.value.splice(index, 1);

    const success = await deleteMessage(messageId);

    if (!success) {
      // rollback si échec : on remet le message à sa place
      currentMessages.value.splice(index, 0, removed);
      console.error("Erreur lors de la suppression du message");
    } else {
      // on rafraîchit la sidebar si le message supprimé était le dernier de la conversation
      await loadConversations();
    }
  };

  // Initialiser les WebSockets
  const initWebSocket = () => {
    onSocketConnected(() => {
      if (authStore.user?.id) {
        socket.emit("messages:register", { userId: authStore.user.id });
      }
    });

    unsubscribeNewMessage = onSocketEvent(
      "messages:new",
      (message: DirectMessage) => {
        if (selectedUser.value?.id === message.sender.id) {
          currentMessages.value.push(message);

          // marquer comme lu immédiatement
          if (socket.connected && authStore.user?.id) {
            socket.emit("messages:markRead", {
              conversationUserId: message.sender.id,
              currentUserId: authStore.user.id,
            });
          }
        }
        loadConversations();
      },
    );

    unsubscribeSent = onSocketEvent(
      "messages:sent",
      (message: DirectMessage) => {
        if (
          selectedUser.value?.id === message.receiver.id &&
          currentMessages.value
        ) {
          currentMessages.value.push(message);
        }
        loadConversations();
      },
    );

    unsubscribeDeleted = onSocketEvent(
      "messages:deleted",
      (data: { messageId: string }) => {
        const index = currentMessages.value.findIndex(
          (m) => m.id === data.messageId,
        );
        if (index !== -1) {
          currentMessages.value.splice(index, 1);
        }
        loadConversations();
      },
    );
    unsubscribeTyping = onSocketEvent(
      "messages:typing",
      (data: { senderId: string; isTyping: boolean }) => {
        if (selectedUser.value?.id === data.senderId) {
          isTyping.value = data.isTyping;
          typingUser.value = data.isTyping
            ? selectedUser.value?.firstName || null
            : null;
        }
      },
    );

    unsubscribeLiked = onSocketEvent(
      "messages:liked",
      (data: { messageId: string; like: any }) => {
        // Find and update the message with the new like
        if (currentMessages.value) {
          const message = currentMessages.value.find(
            (m) => m.id === data.messageId,
          );
          if (message) {
            if (!message.likes) {
              message.likes = [];
            }
            // Check if the like already exists (avoid duplicates)
            if (!message.likes.find((l) => l.id === data.like.id)) {
              message.likes.push(data.like);
            }
          }
        }
      },
    );

    unsubscribeUnliked = onSocketEvent(
      "messages:unliked",
      (data: { messageId: string; userId: string }) => {
        // Find and update the message by removing the like
        if (currentMessages.value) {
          const message = currentMessages.value.find(
            (m) => m.id === data.messageId,
          );
          if (message && message.likes) {
            message.likes = message.likes.filter(
              (l) => l.user.id !== data.userId,
            );
          }
        }
      },
    );
  };

  // Vérifier si un destinataire a été passé depuis le blog
  const checkRecipientFromBlog = async () => {
    const recipientData = sessionStorage.getItem("messageRecipient");
    if (recipientData) {
      try {
        const recipient = JSON.parse(recipientData) as MessageUser;
        sessionStorage.removeItem("messageRecipient");

        selectedUser.value = recipient;
        currentMessages.value = [];

        loadingMessages.value = true;
        try {
          currentMessages.value = await getConversationMessages(recipient.id);
        } catch (error) {
          console.error("Erreur chargement messages:", error);
        } finally {
          loadingMessages.value = false;
        }
      } catch (e) {
        console.error("Erreur parsing recipient:", e);
      }
    }
  };

  // Nettoyage
  const cleanup = () => {
    if (unsubscribeNewMessage) unsubscribeNewMessage();
    if (unsubscribeSent) unsubscribeSent();
    if (unsubscribeTyping) unsubscribeTyping();
    if (unsubscribeLiked) unsubscribeLiked();
    if (unsubscribeUnliked) unsubscribeUnliked();
    if (unsubscribeDeleted) unsubscribeDeleted();

    if (socket.connected && authStore.user?.id) {
      socket.emit("messages:unregister", { userId: authStore.user.id });
    }

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
  };

  // Initialisation
  const init = () => {
    loadConversations();
    loadUsers();
    initWebSocket();
    checkRecipientFromBlog();
  };

  return {
    // State
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
    // Methods
    selectConversation,
    startNewConversation,
    handleSendMessage,
    handleTyping,
    handleToggleLike,
    handleDeleteMessage,
    init,
    cleanup,
  };
}
