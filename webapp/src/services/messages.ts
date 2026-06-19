import apiClient from "../lib/utils/apiClient";
import { getSocket } from "../lib/utils/websocket";
import { useAuthStore } from "../stores/authStore";

export interface MessageUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface MessageLike {
  id: string;
  user: MessageUser;
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  sender: MessageUser;
  receiver: MessageUser;
  body: string;
  isRead: boolean;
  createdAt: string;
  likes?: MessageLike[];
}

export interface Conversation {
  user: MessageUser;
  lastMessage: DirectMessage;
  unreadCount: number;
}

// Récupérer toutes les conversations
export const getConversations = async (): Promise<Conversation[]> => {
  const { data, error } = await apiClient.get<{ body: Conversation[] }>(
    "/messages/conversations",
  );
  if (!data || error) {
    console.error("Error fetching conversations:", error);
    return [];
  }
  return data.body;
};

// Récupérer les messages d'une conversation
export const getConversationMessages = async (
  userId: string,
): Promise<DirectMessage[]> => {
  const { data, error } = await apiClient.get<{ body: DirectMessage[] }>(
    `/messages/conversation/${userId}`,
  );
  if (!data || error) {
    console.error("Error fetching messages:", error);
    return [];
  }
  return data.body;
};

// Envoyer un message
export const sendMessage = async (
  receiverId: string,
  body: string,
): Promise<DirectMessage | null> => {
  const { data, error } = await apiClient.post<{ body: DirectMessage }>(
    "/messages",
    { receiverId, body },
  );
  if (!data || error) {
    console.error("Error sending message:", error);
    return null;
  }
  return data.body;
};

// Supprimer un message
export const deleteMessage = async (messageId: string): Promise<boolean> => {
  try {
    const socket = getSocket();
    const authStore = useAuthStore();

    if (!socket.connected || !authStore.user?.id) {
      // Fallback REST si le socket n'est pas connecté
      const { error } = await apiClient.delete(`/messages/${messageId}`);
      return !error;
    }

    return new Promise((resolve) => {
      let resolved = false;

      const handleError = (error: any) => {
        if (!resolved) {
          resolved = true;
          socket.off("messages:error", handleError);
          socket.off("messages:deleted", handleDeleted);
          console.log("Delete error:", error);
          resolve(false);
        }
      };

      const handleDeleted = (data: { messageId: string }) => {
        if (!resolved && data.messageId === messageId) {
          resolved = true;
          socket.off("messages:error", handleError);
          socket.off("messages:deleted", handleDeleted);
          resolve(true);
        }
      };

      socket.on("messages:error", handleError);
      socket.on("messages:deleted", handleDeleted);

      socket.emit("messages:delete", {
        messageId,
        userId: authStore.user?.id,
      });

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          socket.off("messages:error", handleError);
          socket.off("messages:deleted", handleDeleted);
          resolve(false);
        }
      }, 5000);
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    return false;
  }
};

// Récupérer tous les utilisateurs
export const getUsers = async (): Promise<MessageUser[]> => {
  const { data, error } = await apiClient.get<{ body: MessageUser[] }>(
    "/messages/users",
  );
  if (!data || error) {
    console.error("Error fetching users:", error);
    return [];
  }
  return data.body;
};

// Aimer un message via WebSocket
export const likeMessage = async (messageId: string): Promise<boolean> => {
  try {
    const socket = getSocket();
    const authStore = useAuthStore();

    if (!socket.connected || !authStore.user?.id) {
      // Fallback to REST API if WebSocket is not connected
      const { error } = await apiClient.post(`/messages/${messageId}/like`, {});
      return !error;
    }

    return new Promise((resolve) => {
      let resolved = false;

      const handleError = (error: any) => {
        if (!resolved) {
          resolved = true;
          socket.off("messages:error", handleError);
          socket.off("messages:liked", handleLiked);
          console.log("Like error:", error);
          resolve(false);
        }
      };

      const handleLiked = () => {
        if (!resolved) {
          resolved = true;
          socket.off("messages:error", handleError);
          socket.off("messages:liked", handleLiked);
          resolve(true);
        }
      };

      socket.on("messages:error", handleError);
      socket.on("messages:liked", handleLiked);

      socket.emit("messages:like", {
        messageId,
        userId: authStore.user?.id,
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          socket.off("messages:error", handleError);
          socket.off("messages:liked", handleLiked);
          resolve(false);
        }
      }, 5000);
    });
  } catch (error) {
    console.error("Error liking message:", error);
    return false;
  }
};

// Retirer un like d'un message via WebSocket
export const unlikeMessage = async (messageId: string): Promise<boolean> => {
  try {
    const socket = getSocket();
    const authStore = useAuthStore();

    if (!socket.connected || !authStore.user?.id) {
      // Fallback to REST API if WebSocket is not connected
      const { error } = await apiClient.delete(`/messages/${messageId}/like`);
      return !error;
    }

    return new Promise((resolve) => {
      let resolved = false;

      const handleError = (error: any) => {
        if (!resolved) {
          resolved = true;
          socket.off("messages:error", handleError);
          socket.off("messages:unliked", handleUnliked);
          console.log("Unlike error:", error);
          resolve(false);
        }
      };

      const handleUnliked = () => {
        if (!resolved) {
          resolved = true;
          socket.off("messages:error", handleError);
          socket.off("messages:unliked", handleUnliked);
          resolve(true);
        }
      };

      socket.on("messages:error", handleError);
      socket.on("messages:unliked", handleUnliked);

      socket.emit("messages:unlike", {
        messageId,
        userId: authStore.user?.id,
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          socket.off("messages:error", handleError);
          socket.off("messages:unliked", handleUnliked);
          resolve(false);
        }
      }, 5000);
    });
  } catch (error) {
    console.error("Error unliking message:", error);
    return false;
  }
};
