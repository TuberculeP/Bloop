<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/authStore";
import { getAllPosts, updatePost, deletePost } from "../../services/posts";
import BlogPost from "../../components/blog/BlogPost.vue";
import BaseButton from "../../components/ui/BaseButton.vue";
import type { Post } from "../../lib/utils/types";
import AppLayout from "../../layouts/AppLayout.vue";

const router = useRouter();
const authStore = useAuthStore();

const userPosts = ref<Post[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const editingPost = ref<Post | null>(null);
const editForm = ref({
  body: "",
});

// États de l'utilisateur
const user = computed(() => authStore.user);
const isAuthenticated = computed(() => authStore.isAuthenticated);

// Statistiques utilisateur
const userStats = computed(() => {
  const posts = userPosts.value;
  const totalPosts = posts.length;
  const highlightPosts = posts.filter((p: Post) => p.is_highlight).length;
  const totalComments = posts.reduce(
    (sum: number, post: Post) => sum + (post.comments?.length || 0),
    0,
  );

  return {
    totalPosts,
    highlightPosts,
    totalComments,
  };
});

// Charger les posts de l'utilisateur
const loadUserPosts = async () => {
  if (!user.value) {
    router.push("/login");
    return;
  }

  try {
    isLoading.value = true;
    error.value = null;

    const allPosts = await getAllPosts();
    // Filtrer les posts de l'utilisateur connecté avec vérification défensive
    userPosts.value = allPosts
      .filter(
        (post) =>
          post.author &&
          post.author.id &&
          user.value?.id &&
          post.author.id === user.value.id,
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt || "").getTime() -
          new Date(a.createdAt || "").getTime(),
      );
  } catch (err) {
    console.error("Erreur lors du chargement des posts:", err);
    error.value = "Erreur lors du chargement de vos posts";
  } finally {
    isLoading.value = false;
  }
};

// Commencer l'édition d'un post
const startEdit = (post: Post) => {
  editingPost.value = post;
  editForm.value = {
    body: post.body,
  };
};

// Annuler l'édition
const cancelEdit = () => {
  editingPost.value = null;
  editForm.value = {
    body: "",
  };
};

// Sauvegarder les modifications
const saveEdit = async () => {
  if (!editingPost.value?.id) return;

  try {
    await updatePost(editingPost.value.id.toString(), {
      body: editForm.value.body,
    });

    // Mettre à jour le post dans la liste locale
    const index = userPosts.value.findIndex(
      (p: Post) => p.id === editingPost.value?.id,
    );
    if (index !== -1) {
      userPosts.value[index] = {
        ...userPosts.value[index],
        body: editForm.value.body,
      };
    }

    cancelEdit();
  } catch (err) {
    console.error("Erreur lors de la modification:", err);
    error.value = "Erreur lors de la modification du post";
  }
};

// Supprimer un post
const handleDeletePost = async (postId: number) => {
  if (!confirm("Êtes-vous sûr de vouloir supprimer ce post ?")) return;

  try {
    await deletePost(postId);
    userPosts.value = userPosts.value.filter((p: Post) => p.id !== postId);
  } catch (err) {
    console.error("Erreur lors de la suppression:", err);
    error.value = "Erreur lors de la suppression du post";
  }
};

// Formater la date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

onMounted(() => {
  if (!isAuthenticated.value) {
    router.push("/login");
    return;
  }
  loadUserPosts();
});
</script>

<template>
  <AppLayout>
    <div class="page-container">
      <header class="dashboard-header">
        <div class="profile-info">
          <div class="profile-avatar-large">
            <img
              v-if="user?.profilePicture"
              :src="user.profilePicture"
              :alt="`${user?.firstName} ${user?.lastName}`"
              class="avatar-image"
            />
            <span v-else class="avatar-initials">
              {{ user?.firstName?.charAt(0) }}{{ user?.lastName?.charAt(0) }}
            </span>
          </div>
          <div class="profile-details">
            <h1 class="main-title">
              {{ user?.firstName }}
              <span class="highlight">{{ user?.lastName }}</span>
            </h1>
            <p class="tagline">{{ user?.email }}</p>
            <p class="tagline" style="font-size: 0.9rem">
              Membre depuis {{ formatDate(user?.createdAt?.toString() || "") }}
            </p>
          </div>
        </div>
      </header>

      <main class="dashboard-content">
        <!-- Statistiques -->
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-number">{{ userStats.totalPosts }}</span>
            <span class="stat-label">Posts</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">{{ userStats.highlightPosts }}</span>
            <span class="stat-label">Highlights</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">{{ userStats.totalComments }}</span>
            <span class="stat-label">Commentaires reçus</span>
          </div>
        </div>

        <!-- Erreur -->
        <div v-if="error" class="state-container error">
          <div class="error-box">
            <p>{{ error }}</p>
            <button @click="loadUserPosts" class="btn-text-accent">
              Réessayer le chargement
            </button>
          </div>
        </div>

        <!-- Chargement -->
        <div v-if="isLoading" class="state-container">
          <div class="loader-grid">
            <div class="skeleton-card" v-for="n in 3" :key="n"></div>
          </div>
        </div>

        <!-- Posts -->
        <div v-else class="profile-posts">
          <h2 class="section-title">Mes Posts</h2>

          <!-- Aucun post -->
          <div v-if="userPosts.length === 0" class="state-container empty">
            <div class="empty-illustration">
              <div class="music-note">📝</div>
            </div>
            <h3>Aucun post pour le moment</h3>
            <p>Commencez à partager vos idées !</p>
            <button @click="router.push('/blog')" class="btn-outline">
              Créer mon premier post
            </button>
          </div>

          <!-- Liste des posts -->
          <div v-else class="posts-list">
            <div
              v-for="post in userPosts"
              :key="post.id"
              class="project-card post-item"
            >
              <!-- Mode édition -->
              <div v-if="editingPost?.id === post.id" class="edit-mode">
                <textarea
                  v-model="editForm.body"
                  class="edit-textarea"
                  placeholder="Contenu du post..."
                  rows="4"
                ></textarea>
                <div class="edit-actions">
                  <BaseButton
                    variant="primary"
                    size="small"
                    @click="saveEdit"
                    :disabled="!editForm.body.trim()"
                  >
                    Sauvegarder
                  </BaseButton>
                  <BaseButton variant="ghost" size="small" @click="cancelEdit">
                    Annuler
                  </BaseButton>
                </div>
              </div>

              <!-- Mode affichage -->
              <div v-else class="post-display">
                <BlogPost :post="post" />
                <div class="post-actions">
                  <button class="btn-action" @click="startEdit(post)">
                    <i class="fas fa-pencil-alt"></i>
                    <span>Modifier</span>
                  </button>
                  <button
                    class="btn-action btn-danger"
                    @click="handleDeletePost(post.id!)"
                  >
                    <i class="fas fa-trash-alt"></i>
                    <span>Supprimer</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </AppLayout>
</template>

<style scoped>
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 48px;
  flex-wrap: wrap;
  gap: 20px;
}

.main-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--color-white);
  margin: 0;
  letter-spacing: -1px;
}

.highlight {
  color: var(--color-accent3-hover);
  position: relative;
  display: inline-block;
}

.tagline {
  color: var(--color-white-light);
  opacity: 0.7;
  margin: 8px 0 0 0;
  font-size: 1.1rem;
}

/* ── Avatar ── */
.profile-info {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.profile-avatar-large {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--color-accent3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-white);
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 4px 15px rgba(122, 15, 62, 0.4);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ── Stats ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 48px;
}

.stat-card {
  background: var(--color-bg-secondary-dark);
  border: 1px solid var(--color-border-secondary);
  border-radius: 16px;
  padding: 28px 20px;
  text-align: center;
  transition: all 0.3s ease;
}

.stat-card:hover {
  border-color: var(--color-accent3-hover);
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.stat-number {
  display: block;
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--color-accent3-hover);
  margin-bottom: 8px;
}

.stat-label {
  color: var(--color-white-light);
  opacity: 0.7;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}

/* ── Section title ── */
.section-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-white);
  margin: 0 0 24px 0;
  letter-spacing: -0.5px;
}

/* ── Posts ── */
.posts-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.project-card {
  background: var(--color-bg-secondary-dark);
  border: 1px solid var(--color-border-secondary);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.project-card:hover {
  border-color: var(--color-accent3-hover);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
  background: linear-gradient(
    180deg,
    var(--color-bg-accent3-dark) 0%,
    var(--color-bg-secondary-dark) 100%
  );
}

.post-display {
  padding: 20px;
}

.post-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-secondary);
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--color-border-secondary);
  border-radius: 8px;
  color: var(--color-white-light);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-action:hover {
  border-color: var(--color-accent3-hover);
  color: var(--color-white);
  background: rgba(122, 15, 62, 0.15);
}

.btn-action.btn-danger:hover {
  border-color: #e55;
  color: #f88;
  background: rgba(200, 50, 50, 0.15);
}

/* ── Edit mode ── */
.edit-mode {
  padding: 20px;
}

.edit-textarea {
  width: 100%;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border-secondary);
  border-radius: 8px;
  color: var(--color-white);
  font-size: 1rem;
  line-height: 1.5;
  resize: vertical;
  margin-bottom: 16px;
  box-sizing: border-box;
}

.edit-textarea:focus {
  outline: none;
  border-color: var(--color-accent3-hover);
}

.edit-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* ── États vides / erreur ── */
.state-container {
  text-align: center;
  padding: 60px 20px;
}

.loader-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.skeleton-card {
  height: 140px;
  background: var(--color-bg-secondary-dark);
  border-radius: 16px;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
  }
}

.empty-illustration {
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.5;
}

.state-container h3 {
  color: var(--color-white);
  font-size: 1.5rem;
  margin-bottom: 10px;
}

.state-container p {
  color: var(--color-white-light);
  margin-bottom: 24px;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.btn-outline {
  background: transparent;
  border: 2px solid var(--color-accent3);
  color: var(--color-accent3-hover);
  padding: 12px 32px;
  border-radius: 50px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-outline:hover {
  background: var(--color-accent3);
  color: var(--color-white);
}

.btn-text-accent {
  background: none;
  border: none;
  color: var(--color-error-hover);
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  margin-top: 10px;
}

.error-box {
  color: var(--color-white-light);
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .profile-info {
    flex-direction: column;
    text-align: center;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .post-actions {
    flex-direction: column;
  }

  .btn-action {
    width: 100%;
    justify-content: center;
  }
}
</style>
