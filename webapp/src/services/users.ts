// services/users.ts
import axios from "axios";
import type { User } from "../lib/utils/types";

// Configuration d'axios pour inclure les cookies de session
axios.defaults.withCredentials = true;

const API_URL = "http://localhost:3000/api/users";

// Pour l'instant, on simule les données utilisateurs
// En attendant l'implémentation de l'API côté serveur
const mockUsers: User[] = [
  {
    id: "1",
    email: "alice@example.com",
    firstName: "Alice",
    lastName: "Martin",
    isActive: true,
    role: "user",
    following: [],
    followers: [],
    posts: [],
    likedPosts: [],
    subscription: {},
    sentMessages: [],
    receivedMessages: [],
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    email: "bob@example.com",
    firstName: "Bob",
    lastName: "Dupont",
    isActive: true,
    role: "user",
    following: [],
    followers: [],
    posts: [],
    likedPosts: [],
    subscription: {},
    sentMessages: [],
    receivedMessages: [],
    createdAt: new Date("2024-02-20"),
  },
  {
    id: "3",
    email: "charlie@example.com",
    firstName: "Charlie",
    lastName: "Leroy",
    isActive: true,
    role: "admin",
    following: [],
    followers: [],
    posts: [],
    likedPosts: [],
    subscription: {},
    sentMessages: [],
    receivedMessages: [],
    createdAt: new Date("2024-01-10"),
  },
  {
    id: "4",
    email: "diana@example.com",
    firstName: "Diana",
    lastName: "Moreau",
    isActive: true,
    role: "user",
    following: [],
    followers: [],
    posts: [],
    likedPosts: [],
    subscription: {},
    sentMessages: [],
    receivedMessages: [],
    createdAt: new Date("2024-03-05"),
  },
];

export const getAllUsers = async (): Promise<User[]> => {
  try {
    // TODO: Remplacer par un vrai appel API quand l'endpoint sera disponible
    // const response = await axios.get(API_URL);
    // return response.data;

    // Simulation de délai réseau
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockUsers;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

export const followUser = async (userId: string): Promise<void> => {
  try {
    // TODO: Implémenter l'appel API pour suivre un utilisateur
    // await axios.post(`${API_URL}/${userId}/follow`);

    // Simulation de délai réseau
    await new Promise((resolve) => setTimeout(resolve, 300));
    console.log(`Following user ${userId}`);
  } catch (error) {
    console.error("Error following user:", error);
    throw error;
  }
};

export const unfollowUser = async (userId: string): Promise<void> => {
  try {
    // TODO: Implémenter l'appel API pour ne plus suivre un utilisateur
    // await axios.delete(`${API_URL}/${userId}/follow`);

    // Simulation de délai réseau
    await new Promise((resolve) => setTimeout(resolve, 300));
    console.log(`Unfollowing user ${userId}`);
  } catch (error) {
    console.error("Error unfollowing user:", error);
    throw error;
  }
};

export const getUserProfile = async (userId: string): Promise<User> => {
  try {
    // TODO: Implémenter l'appel API pour récupérer un profile utilisateur
    // const response = await axios.get(`${API_URL}/${userId}`);
    // return response.data;

    // Simulation avec les données mockées
    await new Promise((resolve) => setTimeout(resolve, 300));
    const user = mockUsers.find((u) => u.id === userId);
    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }
    return user;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};
