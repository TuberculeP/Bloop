<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getAllUsers, followUser, unfollowUser } from "../../services/users";
import type { User } from "../../lib/utils/types";
import { useAuthStore } from "../../stores/authStore";
import BaseButton from "../ui/BaseButton.vue";

const authStore = useAuthStore();

const users = ref<User[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const followingUsers = ref<Set<string>>(new Set());
const followingInProgress = ref<Set<string>>(new Set());

// Charger tous les utilisateurs
const fetchUsers = async () => {
  try {
    loading.value = true;
    error.value = null;

    const result = await getAllUsers();
    // Filtrer l'utilisateur connecté de la liste
    users.value = result.filter((user) => user.id !== authStore.user?.id);
  } catch (err) {
    error.value = "Erreur lors du chargement des utilisateurs";
    console.error("Erreur:", err);
  } finally {
    loading.value = false;
  }
};

// Basculer le suivi d'un utilisateur
const toggleFollow = async (userId: string) => {
  if (!authStore.isAuthenticated) return;
  if (followingInProgress.value.has(userId)) return;

  try {
    followingInProgress.value.add(userId);

    const isCurrentlyFollowing = followingUsers.value.has(userId);

    if (isCurrentlyFollowing) {
      await unfollowUser(userId);
      followingUsers.value.delete(userId);
    } else {
      await followUser(userId);
      followingUsers.value.add(userId);
    }
  } catch (error) {
    console.error("Erreur lors du suivi/désuivi:", error);
    // TODO: Afficher une notification d'erreur
  } finally {
    followingInProgress.value.delete(userId);
  }
};

// Voir le profile d'un utilisateur
const viewProfile = (userId: string) => {
  // TODO: Naviguer vers la page de profile ou ouvrir une modal
  console.log(`Voir le profil de l'utilisateur ${userId}`);
  alert(
    `Fonctionnalité à implémenter : voir le profil de l'utilisateur ${userId}`,
  );
};

// Vérifier si on suit un utilisateur
const isFollowing = (userId: string) => {
  return followingUsers.value.has(userId);
};

// Vérifier si le suivi est en cours
const isFollowingInProgress = (userId: string) => {
  return followingInProgress.value.has(userId);
};

// Formater la date d'inscription
const formatJoinDate = (date: Date) => {
  return new Date(date).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
  });
};

// Obtenir le nom complet d'un utilisateur
const getDisplayName = (user: User) => {
  return `${user.firstName} ${user.lastName}`;
};

// Obtenir les initiales d'un utilisateur pour l'avatar
const getInitials = (user: User) => {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
};

onMounted(() => {
  fetchUsers();
});
</script>

<template>
  <div class="users-container">
    <div class="users-header">
      <h2>Utilisateurs</h2>
      <p class="users-subtitle">
        Découvrez et suivez d'autres membres de la communauté
      </p>
    </div>

    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>Chargement des utilisateurs...</p>
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <BaseButton variant="ghost" size="small" @click="fetchUsers">
        Réessayer
      </BaseButton>
    </div>

    <div v-else-if="users.length === 0" class="empty-state">
      <p>Aucun utilisateur trouvé.</p>
    </div>

    <div v-else class="users-list">
      <div v-for="user in users" :key="user.id" class="user-card">
        <!-- Avatar et informations de base -->
        <div class="user-info">
          <div class="user-avatar">
            {{ getInitials(user) }}
          </div>

          <div class="user-details">
            <h3 class="user-name">{{ getDisplayName(user) }}</h3>
            <p class="user-joined">
              Membre depuis {{ formatJoinDate(user.createdAt) }}
            </p>
            <div class="user-badges">
              <span v-if="user.role === 'admin'" class="badge admin"
                >Admin</span
              >
              <span v-if="user.isActive" class="badge active">Actif</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="user-actions">
          <BaseButton
            variant="ghost"
            size="small"
            @click="viewProfile(user.id)"
            color="secondary"
          >
            Voir le profil
          </BaseButton>

          <BaseButton
            v-if="authStore.isAuthenticated"
            :variant="isFollowing(user.id) ? 'primary' : 'ghost'"
            size="small"
            @click="toggleFollow(user.id)"
            :loading="isFollowingInProgress(user.id)"
            :disabled="isFollowingInProgress(user.id)"
            color="accent"
          >
            {{ isFollowing(user.id) ? "Suivi" : "Suivre" }}
          </BaseButton>

          <div v-else class="follow-disabled">
            <small>Connectez-vous pour suivre</small>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.users-container {
  background: var(--color-bg-primary-dark);
  border: 1px solid var(--color-border-secondary);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  color: var(--color-white);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.users-header {
  margin-bottom: 24px;
}

.users-header h2 {
  margin-bottom: 16px;
}

.users-subtitle {
  color: var(--color-secondary);
  margin: 0;
  font-size: 0.9em;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  color: var(--color-secondary);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-secondary);
  border-top: 3px solid var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-error);
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-secondary);
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--color-bg-secondary-dark);
  border: 1px solid var(--color-black);
  border-radius: 10px;
  padding: 20px;
  transition: all 0.3s ease;
}

.user-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px
    color-mix(in srgb, var(--color-secondary) 10%, transparent);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.user-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    var(--color-accent),
    var(--color-secondary)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--color-white);
  font-size: 1.2em;
  flex-shrink: 0;
}

.user-details {
  flex: 1;
}

.user-name {
  color: var(--color-white);
  margin: 0 0 4px 0;
  font-size: 1.1em;
  font-weight: 600;
}

.user-email {
  color: var(--color-secondary);
  margin: 0 0 6px 0;
  font-size: 0.9em;
}

.user-joined {
  color: var(--color-secondary);
  margin: 0 0 8px 0;
  font-size: 0.8em;
  opacity: 0.8;
}

.user-badges {
  display: flex;
  gap: 8px;
}

.badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.7em;
  font-weight: 600;
  text-transform: uppercase;
}

.badge.admin {
  background-color: var(--color-accent);
  color: var(--color-black);
}

.badge.active {
  background-color: var(--color-secondary);
  color: var(--color-black);
}

.user-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.follow-disabled {
  color: var(--color-secondary);
  font-size: 0.8em;
  text-align: center;
  padding: 8px;
  opacity: 0.7;
}

/* Responsive */
@media (max-width: 768px) {
  .user-card {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .user-info {
    justify-content: center;
    text-align: center;
  }

  .user-actions {
    flex-direction: row;
    justify-content: center;
    align-items: center;
  }
}

@media (max-width: 480px) {
  .users-container {
    padding: 16px;
  }

  .user-card {
    padding: 16px;
  }

  .user-info {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
}
</style>
