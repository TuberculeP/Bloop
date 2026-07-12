<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { getAllPosts } from "../../services/posts";
import type { Post, User } from "../../lib/utils/types";

type TopLikedUser = {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  likesCount: number;
};

const loading = ref(true);
const error = ref<string | null>(null);
const posts = ref<Post[]>([]);

const fetchPosts = async () => {
  try {
    loading.value = true;
    error.value = null;
    const result = await getAllPosts();
    posts.value = Array.isArray(result) ? result : [];
  } catch (err) {
    error.value = "Erreur lors du chargement des posts populaires";
    console.error("Erreur lors du chargement des posts populaires:", err);
    posts.value = [];
  } finally {
    loading.value = false;
  }
};

const topLikedUsers = computed<TopLikedUser[]>(() => {
  const ranking = new Map<string, TopLikedUser>();

  for (const post of posts.value) {
    const author = post.author as User | undefined;
    if (!author?.id) continue;

    const likesCount = post.likesCount ?? 0;
    const current = ranking.get(author.id);

    if (current) {
      current.likesCount += likesCount;
      continue;
    }

    ranking.set(author.id, {
      id: author.id,
      firstName: author.firstName,
      lastName: author.lastName,
      //   profilePicture: author.profilePicture,
      likesCount,
    });
  }

  return Array.from(ranking.values())
    .sort((a, b) => b.likesCount - a.likesCount)
    .slice(0, 5);
});

const getDisplayName = (user: TopLikedUser) =>
  `${user.firstName} ${user.lastName}`;

const getInitials = (user: TopLikedUser) =>
  `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

onMounted(() => {
  fetchPosts();
});
</script>

<template>
  <div class="top-liked-users-container">
    <div class="header">
      <h2>Top des créateurs likés</h2>
    </div>

    <div v-if="loading" class="state">Chargement...</div>

    <div v-else-if="error" class="state error">{{ error }}</div>

    <div v-else-if="topLikedUsers.length === 0" class="state empty">
      Aucun post disponible pour établir un classement.
    </div>

    <div v-else class="users-list">
      <article v-for="user in topLikedUsers" :key="user.id" class="user-card">
        <div class="avatar">
          <img
            v-if="user.profilePicture"
            :src="user.profilePicture"
            :alt="`Photo de profil de ${getDisplayName(user)}`"
          />
          <span v-else>{{ getInitials(user) }}</span>
        </div>

        <div class="info">
          <h3>{{ getDisplayName(user) }}</h3>
          <p>{{ user.likesCount }} like{{ user.likesCount > 1 ? "s" : "" }}</p>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.top-liked-users-container {
  background: hsla(325, 30%, 8%, 0.55);
  backdrop-filter: blur(1px);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-md);
  padding: 20px;
  color: var(--color-white);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header h2 {
  margin: 0 0 8px;
}

.header p {
  margin: 0;
  color: var(--color-secondary);
  font-size: 0.9em;
}

.state {
  color: var(--color-secondary);
  font-style: italic;
}

.state.error {
  color: var(--color-error);
  font-style: normal;
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-secondary-dark);
  border: 1px solid color-mix(in srgb, var(--color-white) 8%, transparent);
}

.rank {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent);
  color: var(--color-black);
  font-weight: 700;
  flex-shrink: 0;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(
    135deg,
    var(--color-accent),
    var(--color-secondary)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  font-weight: 700;
  flex-shrink: 0;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info {
  min-width: 0;
  flex: 1;
}

.info h3 {
  margin: 0 0 4px 0;
  font-size: 0.95em;
}

.info p {
  margin: 0;
  font-size: 0.85em;
  color: var(--color-secondary);
}

/* Responsive Design */
@media (max-width: 768px) {
  .top-liked-users-container {
    padding: 16px;
    gap: 12px;
  }

  .header h2 {
    font-size: 1.1em;
  }

  .header p {
    font-size: 0.8em;
  }

  .user-card {
    padding: 10px;
    gap: 10px;
  }

  .avatar {
    width: 40px;
    height: 40px;
    font-size: 0.8em;
  }

  .info h3 {
    font-size: 0.9em;
    margin-bottom: 2px;
  }

  .info p {
    font-size: 0.8em;
  }
}

@media (max-width: 640px) {
  .top-liked-users-container {
    padding: 12px;
    gap: 8px;
  }

  .header h2 {
    font-size: 1em;
    margin-bottom: 4px;
  }

  .header p {
    font-size: 0.75em;
    margin: 0;
  }

  .user-card {
    padding: 8px;
    gap: 8px;
    border-radius: var(--radius-md);
  }

  .avatar {
    width: 36px;
    height: 36px;
    min-width: 36px;
  }

  .info h3 {
    font-size: 0.8em;
    margin-bottom: 2px;
  }

  .info p {
    font-size: 0.7em;
  }
}

.info h3 {
  margin: 0 0 4px;
  font-size: 1em;
}

.info p {
  margin: 0;
  color: var(--color-secondary);
  font-size: 0.85em;
}
</style>
