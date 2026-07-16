import { Router } from "express";
import pg from "../../config/db.config";
import { DirectMessage } from "../../config/entities/DirectMessage";
import { User } from "../../config/entities/User";
import { MessageLike } from "../../config/entities/MessageLike";

const messagesRouter = Router();

// Récupérer toutes les conversations de l'utilisateur connecté
messagesRouter.get("/conversations", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({
        status: 401,
        message: "Login required",
      });
      return;
    }

    const messageRepository = pg.getRepository(DirectMessage);
    const userId = req.user.id;

    // Récupérer tous les messages envoyés ou reçus par l'utilisateur
    const messages = await messageRepository.find({
      where: [
        { sender: { id: userId }, isActive: true },
        { receiver: { id: userId }, isActive: true },
      ],
      relations: ["sender", "receiver"],
      order: { createdAt: "DESC" },
    });

    // Grouper par conversation (avec l'autre utilisateur)
    const conversationsMap = new Map<string, any>();

    for (const message of messages) {
      const otherUser =
        message.sender.id === userId ? message.receiver : message.sender;
      const conversationId = otherUser.id;

      if (!conversationsMap.has(conversationId)) {
        conversationsMap.set(conversationId, {
          user: {
            id: otherUser.id,
            firstName: otherUser.firstName,
            lastName: otherUser.lastName,
            email: otherUser.email,
            profilePicture: otherUser.profilePicture,
          },
          lastMessage: message,
          unreadCount:
            message.receiver.id === userId && !message.isRead ? 1 : 0,
        });
      } else {
        const conv = conversationsMap.get(conversationId);
        if (message.receiver.id === userId && !message.isRead) {
          conv.unreadCount++;
        }
      }
    }

    const conversations = Array.from(conversationsMap.values());

    res.status(200).json({
      status: 200,
      message: "Conversations retrieved",
      body: conversations,
    });
  } catch (err) {
    res.status(500).json({ status: 500, message: "Server error", error: err });
  }
});

// Récupérer les messages d'une conversation avec un utilisateur
messagesRouter.get("/conversation/:userId", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({
        status: 401,
        message: "Login required",
      });
      return;
    }

    const messageRepository = pg.getRepository(DirectMessage);
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    const messages = await messageRepository.find({
      where: [
        {
          sender: { id: currentUserId },
          receiver: { id: otherUserId },
          isActive: true,
        },
        {
          sender: { id: otherUserId },
          receiver: { id: currentUserId },
          isActive: true,
        },
      ],
      relations: ["sender", "receiver", "likes", "likes.user"],
      order: { createdAt: "ASC" },
    });

    // Marquer les messages reçus comme lus
    const unreadMessages = messages.filter(
      (m) => m.receiver.id === currentUserId && !m.isRead,
    );
    for (const msg of unreadMessages) {
      msg.isRead = true;
      await messageRepository.save(msg);
    }

    res.status(200).json({
      status: 200,
      message: "Messages retrieved",
      body: messages,
    });
  } catch (err) {
    res.status(500).json({ status: 500, message: "Server error", error: err });
  }
});

// Envoyer un message
messagesRouter.post("/", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({
        status: 401,
        message: "Login required",
      });
      return;
    }

    const { receiverId, body } = req.body;

    if (!receiverId || !body) {
      res.status(422).json({
        status: 422,
        message: "Missing receiverId or body",
      });
      return;
    }

    const userRepository = pg.getRepository(User);
    const messageRepository = pg.getRepository(DirectMessage);

    const sender = await userRepository.findOneBy({ id: req.user.id });
    const receiver = await userRepository.findOneBy({ id: receiverId });

    if (!sender) {
      res.status(404).json({
        status: 404,
        message: "User not found",
      });
      return;
    }

    if (!receiver) {
      res.status(404).json({
        status: 404,
        message: "Receiver not found",
      });
      return;
    }

    const newMessage = messageRepository.create({
      sender,
      receiver,
      body,
    });

    await messageRepository.save(newMessage);

    res.status(201).json({
      status: 201,
      message: "Message sent",
      body: newMessage,
    });
  } catch (err) {
    res.status(500).json({ status: 500, message: "Server error", error: err });
  }
});

// Supprimer un message
messagesRouter.delete("/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({
        status: 401,
        message: "Login required",
      });
      return;
    }

    const messageRepository = pg.getRepository(DirectMessage);
    const message = await messageRepository.findOne({
      where: { id: req.params.id },
      relations: ["sender"],
    });

    if (!message) {
      res.status(404).json({
        status: 404,
        message: "Message not found",
      });
      return;
    }

    if (message.sender.id !== req.user.id) {
      res.status(401).json({
        status: 401,
        message: "Not the sender of this message",
      });
      return;
    }

    message.isActive = false;
    await messageRepository.save(message);

    res.status(200).json({
      status: 200,
      message: "Message deleted",
    });
  } catch (err) {
    res.status(500).json({ status: 500, message: "Server error", error: err });
  }
});

// Récupérer tous les utilisateurs pour démarrer une conversation
messagesRouter.get("/users", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({
        status: 401,
        message: "Login required",
      });
      return;
    }

    const userRepository = pg.getRepository(User);
    const users = await userRepository.find({
      where: { isActive: true },
      select: ["id", "firstName", "lastName", "email", "profilePicture"],
    });

    // Exclure l'utilisateur actuel
    const filteredUsers = users.filter((u) => u.id !== req.user.id);

    res.status(200).json({
      status: 200,
      message: "Users retrieved",
      body: filteredUsers,
    });
  } catch (err) {
    res.status(500).json({ status: 500, message: "Server error", error: err });
  }
});

// Aimer un message
messagesRouter.post("/:messageId/like", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({
        status: 401,
        message: "Login required",
      });
      return;
    }

    const messageRepository = pg.getRepository(DirectMessage);
    const userRepository = pg.getRepository(User);
    const likeRepository = pg.getRepository(MessageLike);

    const messageId = req.params.messageId;
    const userId = req.user.id;

    const message = await messageRepository.findOneBy({ id: messageId });
    const user = await userRepository.findOneBy({ id: userId });

    if (!message) {
      res.status(404).json({
        status: 404,
        message: "Message not found",
      });
      return;
    }

    if (!user) {
      res.status(404).json({
        status: 404,
        message: "User not found",
      });
      return;
    }

    // Vérifier si le like existe déjà
    const existingLike = await likeRepository.findOneBy({
      user: { id: userId },
      message: { id: messageId },
    });

    if (existingLike) {
      res.status(409).json({
        status: 409,
        message: "Message already liked",
      });
      return;
    }

    const newLike = likeRepository.create({
      user,
      message,
    });

    await likeRepository.save(newLike);

    res.status(201).json({
      status: 201,
      message: "Message liked",
      body: newLike,
    });
  } catch (err) {
    res.status(500).json({ status: 500, message: "Server error", error: err });
  }
});

// Retirer un like d'un message
messagesRouter.delete("/:messageId/like", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({
        status: 401,
        message: "Login required",
      });
      return;
    }

    const likeRepository = pg.getRepository(MessageLike);

    const messageId = req.params.messageId;
    const userId = req.user.id;

    const like = await likeRepository.findOne({
      where: {
        user: { id: userId },
        message: { id: messageId },
      },
    });

    if (!like) {
      res.status(404).json({
        status: 404,
        message: "Like not found",
      });
      return;
    }

    await likeRepository.remove(like);

    res.status(200).json({
      status: 200,
      message: "Like removed",
    });
  } catch (err) {
    res.status(500).json({ status: 500, message: "Server error", error: err });
  }
});

messagesRouter.get("/notifications/unread-count", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({
        status: 401,
        message: "Login required",
      });
      return;
    }

    const messageRepository = pg.getRepository(DirectMessage);
    const userId = req.user.id;

    const unreadCount = await messageRepository.count({
      where: { receiver: { id: userId }, isRead: false, isActive: true },
    });

    res.status(200).json({
      status: 200,
      message: "Unread messages count retrieved",
      body: { unreadCount },
    });
  } catch (err) {
    res.status(500).json({ status: 500, message: "Server error", error: err });
  }
});

export default messagesRouter;
