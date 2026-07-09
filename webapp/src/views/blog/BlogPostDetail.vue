<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getPostById } from "../../services/posts";
import BlogPost from "../../components/blog/BlogPost.vue";
import BaseButton from "../../components/ui/BaseButton.vue";
import type { Post } from "../../lib/utils/types";
import AppLayout from "../../layouts/AppLayout.vue";
const route = useRoute();
const router = useRouter();

const post = ref<Post | null>(null);

const isLoading = ref(true);
const error = ref<string | null>(null);

const postId = ref<string>(
  Array.isArray(route.params.id)
    ? route.params.id[0]
    : (route.params.id as string),
);

// Charger le post
const loadPost = async () => {
  console.log(`Chargement du post avec ID: ${postId.value}`);

  if (!postId.value) {
    console.log(`ID de post invalide: ${postId.value}`);

    error.value = "ID de post invalide";
    isLoading.value = false;
    return;
  }

  try {
    isLoading.value = true;
    error.value = null;

    // Charger le post principal
    const currentPost = await getPostById(postId.value);
    post.value = currentPost;
  } catch (err) {
    console.error("Erreur lors du chargement du post:", err);
    error.value = "Post introuvable ou erreur de chargement";
    post.value = null;
  } finally {
    isLoading.value = false;
  }
};

// Navigation
const goBack = () => {
  router.back();
};

const goToBlog = () => {
  router.push("/blog");
};

onMounted(() => {
  loadPost();
});
</script>

<template>
  <AppLayout>
    <div class="post-detail-container">
      <!-- Navigation -->
      <div class="post-navigation">
        <BaseButton variant="ghost" size="small" @click="goBack">
          ← Retour
        </BaseButton>
        <BaseButton variant="ghost" size="small" @click="goToBlog">
          Voir tous les posts
        </BaseButton>
      </div>

      <!-- État de chargement -->
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Chargement du post...</p>
      </div>

      <!-- État d'erreur -->
      <div v-else-if="error" class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>Erreur</h3>
        <p>{{ error }}</p>
        <div class="error-actions">
          <BaseButton variant="primary" @click="loadPost">
            Réessayer
          </BaseButton>
          <BaseButton variant="ghost" @click="goToBlog">
            Retour au blog
          </BaseButton>
        </div>
      </div>

      <!-- Contenu du post -->
      <div v-else-if="post" class="post-content">
        <!-- Post principal -->
        <div class="main-post">
          <BlogPost :post="post" :show-expanded="true" />
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.post-detail-container {
  max-width: 900px;
  min-width: 80%;
  margin: 0 auto;
  padding: 2rem 1rem;
  padding-top: 144px;
}

/* Navigation */
.post-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border-secondary);
}

/* États de chargement et d'erreur */
.loading-state,
.error-state {
  text-align: center;
  padding: 3rem 1rem;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid var(--color-border-secondary);
  border-top: 3px solid var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-state h3 {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  color: var(--color-text-primary);
  margin: 0 0 1rem 0;
}

.error-state p {
  color: var(--color-text-secondary);
  margin: 0 0 2rem 0;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* Contenu principal */
.post-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.main-post {
  background: var(--color-background-primary);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Responsive */
@media (max-width: 768px) {
  .post-detail-container {
    padding: 1rem 0.75rem;
    padding-top: 1rem; /* Padding normal pour mobile */
  }

  .post-navigation {
    flex-direction: column;
    gap: 1rem;
  }

  .error-actions {
    flex-direction: column;
    align-items: center;
  }
}
</style>
