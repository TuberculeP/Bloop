import type { Socket } from "socket.io";
import type { EventGroup } from "./event_handler";
import pg from "../config/db.config";
import { DirectMessage } from "../config/entities/DirectMessage";
import { User } from "../config/entities/User";
import { MessageLike } from "../config/entities/MessageLike";

// Map pour garder la trace des utilisateurs connectés (userId -> socketId)
export const connectedUsers = new Map<string, string>();

const messagesEvents: EventGroup = {
  // Quand un utilisateur se connecte, il s'enregistre avec son userId
  register: ({ ws, data }) => {
    if (!ws || !data?.userId) return;

    connectedUsers.set(data.userId, ws.id);
    console.log(`User ${data.userId} registered with socket ${ws.id}`);

    // Notifier l'utilisateur qu'il est bien connecté
    ws.emit("messages:registered", { success: true });
  },

  // Quand un utilisateur se déconnecte
  unregister: ({ data }) => {
    if (!data?.userId) return;

    connectedUsers.delete(data.userId);
    console.log(`User ${data.userId} unregistered`);
  },

  // Envoyer un message en temps réel
  send: async ({ ws, data }) => {
    if (!ws || !data?.receiverId || !data?.body || !data?.senderId) {
      ws?.emit("messages:error", { message: "Missing data" });
      return;
    }

    try {
      const userRepository = pg.getRepository(User);
      const messageRepository = pg.getRepository(DirectMessage);

      const sender = await userRepository.findOneBy({ id: data.senderId });
      const receiver = await userRepository.findOneBy({ id: data.receiverId });

      if (!sender || !receiver) {
        ws.emit("messages:error", { message: "User not found" });
        return;
      }

      // Créer et sauvegarder le message
      const newMessage = messageRepository.create({
        sender,
        receiver,
        body: data.body,
      });

      await messageRepository.save(newMessage);

      // Préparer le message à envoyer
      const messagePayload = {
        id: newMessage.id,
        sender: {
          id: sender.id,
          firstName: sender.firstName,
          lastName: sender.lastName,
          email: sender.email,
        },
        receiver: {
          id: receiver.id,
          firstName: receiver.firstName,
          lastName: receiver.lastName,
          email: receiver.email,
        },
        body: newMessage.body,
        isRead: false,
        createdAt: newMessage.createdAt,
      };

      // Envoyer au sender (confirmation)
      ws.emit("messages:sent", messagePayload);

      // Envoyer au receiver s'il est connecté
      const receiverSocketId = connectedUsers.get(data.receiverId);
      if (receiverSocketId) {
        ws.to(receiverSocketId).emit("messages:new", messagePayload);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      ws.emit("messages:error", { message: "Failed to send message" });
    }
  },

  // Marquer les messages comme lus
  markRead: async ({ ws, data }) => {
    if (!data?.conversationUserId || !data?.currentUserId) return;

    try {
      const messageRepository = pg.getRepository(DirectMessage);

      await messageRepository
        .createQueryBuilder()
        .update(DirectMessage)
        .set({ isRead: true })
        .where(
          "senderId = :senderId AND receiverId = :receiverId AND isRead = false",
          {
            senderId: data.conversationUserId,
            receiverId: data.currentUserId,
          },
        )
        .execute();

      ws?.emit("messages:markedRead", { success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  },

  // Notification de typing
  typing: ({ ws, data }) => {
    if (!data?.receiverId || !data?.senderId) return;

    const receiverSocketId = connectedUsers.get(data.receiverId);
    if (receiverSocketId) {
      ws?.to(receiverSocketId).emit("messages:typing", {
        senderId: data.senderId,
        isTyping: data.isTyping,
      });
    }
  },

  // Aimer un message
  like: async ({ ws, data }) => {
    if (!ws || !data?.messageId || !data?.userId) {
      ws?.emit("messages:error", { message: "Missing data" });
      return;
    }

    try {
      const userRepository = pg.getRepository(User);
      const messageRepository = pg.getRepository(DirectMessage);
      const likeRepository = pg.getRepository(MessageLike);

      const user = await userRepository.findOneBy({ id: data.userId });
      const message = await messageRepository.findOne({
        where: { id: data.messageId },
        relations: ["likes", "likes.user", "sender", "receiver"],
      });

      if (!user || !message) {
        ws.emit("messages:error", { message: "User or message not found" });
        return;
      }

      // Vérifier si l'utilisateur a déjà liké
      const existingLike = await likeRepository.findOneBy({
        user: { id: data.userId },
        message: { id: data.messageId },
      });

      if (existingLike) {
        ws.emit("messages:error", { message: "Already liked" });
        return;
      }

      // Créer et sauvegarder le like
      const newLike = likeRepository.create({ user, message });
      await likeRepository.save(newLike);

      // Préparer la charge utile du like
      const likePayload = {
        id: newLike.id,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
        createdAt: newLike.createdAt,
      };

      // Broadcaser le like à tous les utilisateurs dans la conversation
      // Envoyer au sender du message
      const senderSocketId = connectedUsers.get(message.sender.id);
      if (senderSocketId && message.sender.id !== data.userId) {
        ws?.to(senderSocketId).emit("messages:liked", {
          messageId: data.messageId,
          like: likePayload,
        });
      }

      // Envoyer au receiver du message
      const receiverSocketId = connectedUsers.get(message.receiver.id);
      if (receiverSocketId && message.receiver.id !== data.userId) {
        ws?.to(receiverSocketId).emit("messages:liked", {
          messageId: data.messageId,
          like: likePayload,
        });
      }

      // Confirmer au client qui a liké
      ws.emit("messages:liked", {
        messageId: data.messageId,
        like: likePayload,
      });
    } catch (error) {
      console.error("Error liking message:", error);
      ws.emit("messages:error", { message: "Failed to like message" });
    }
  },

  // Retirer un like d'un message
  unlike: async ({ ws, data }) => {
    if (!ws || !data?.messageId || !data?.userId) {
      ws?.emit("messages:error", { message: "Missing data" });
      return;
    }

    try {
      const likeRepository = pg.getRepository(MessageLike);
      const messageRepository = pg.getRepository(DirectMessage);

      const message = await messageRepository.findOne({
        where: { id: data.messageId },
        relations: ["sender", "receiver"],
      });

      if (!message) {
        ws.emit("messages:error", { message: "Message not found" });
        return;
      }

      // Trouver et supprimer le like
      const like = await likeRepository.findOneBy({
        user: { id: data.userId },
        message: { id: data.messageId },
      });

      if (!like) {
        ws.emit("messages:error", { message: "Like not found" });
        return;
      }

      await likeRepository.remove(like);

      // Broadcaser le unlike à tous les utilisateurs dans la conversation
      // Envoyer au sender du message
      const senderSocketId = connectedUsers.get(message.sender.id);
      if (senderSocketId && message.sender.id !== data.userId) {
        ws?.to(senderSocketId).emit("messages:unliked", {
          messageId: data.messageId,
          userId: data.userId,
        });
      }

      // Envoyer au receiver du message
      const receiverSocketId = connectedUsers.get(message.receiver.id);
      if (receiverSocketId && message.receiver.id !== data.userId) {
        ws?.to(receiverSocketId).emit("messages:unliked", {
          messageId: data.messageId,
          userId: data.userId,
        });
      }

      // Confirmer au client qui a unliké
      ws.emit("messages:unliked", {
        messageId: data.messageId,
        userId: data.userId,
      });
    } catch (error) {
      console.error("Error unliking message:", error);
      ws.emit("messages:error", { message: "Failed to unlike message" });
    }
  },

  // Supprimer un message
  delete: async ({ ws, data }) => {
    if (!ws || !data?.messageId || !data?.userId) {
      ws?.emit("messages:error", { message: "Missing data" });
      return;
    }

    try {
      const messageRepository = pg.getRepository(DirectMessage);
      const likeRepository = pg.getRepository(MessageLike);

      const message = await messageRepository.findOne({
        where: { id: data.messageId },
        relations: ["sender", "receiver", "likes"],
      });

      if (!message) {
        ws.emit("messages:error", { message: "Message not found" });
        return;
      }

      if (message.sender.id !== data.userId) {
        ws.emit("messages:error", { message: "Not authorized" });
        return;
      }

      // On capture tout ce dont on a besoin AVANT le remove()
      const senderId = message.sender.id;
      const receiverId = message.receiver.id;
      const messageId = data.messageId;

      // Supprimer d'abord les likes associés pour éviter le conflit de FK
      if (message.likes && message.likes.length > 0) {
        await likeRepository.remove(message.likes);
      }

      await messageRepository.remove(message);

      // Confirmer à l'auteur de la suppression
      ws.emit("messages:deleted", { messageId });

      // Notifier l'autre participant en temps réel
      const otherUserId = senderId === data.userId ? receiverId : senderId;

      const otherSocketId = connectedUsers.get(otherUserId);
      if (otherSocketId) {
        ws.to(otherSocketId).emit("messages:deleted", { messageId });
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      ws.emit("messages:error", { message: "Failed to delete message" });
    }
  },
};

// Gérer la déconnexion des sockets
export const handleDisconnect = (socket: Socket) => {
  // Trouver et supprimer l'utilisateur déconnecté
  for (const [userId, socketId] of connectedUsers.entries()) {
    if (socketId === socket.id) {
      connectedUsers.delete(userId);
      console.log(`User ${userId} disconnected`);
      break;
    }
  }
};

export default messagesEvents;
