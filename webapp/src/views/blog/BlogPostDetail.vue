<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getPostById } from "../../services/posts";
import BlogPost from "../../components/blog/BlogPost.vue";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseSpinner from "../../components/ui/BaseSpinner.vue";
import EmptyState from "../../components/ui/EmptyState.vue";
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
    <div class="page-container">
      <!-- Navigation -->
      <div class="post-navigation">
        <BaseButton
          variant="ghost"
          size="small"
          @click="goBack"
          label="Retour"
          left-icon="fas fa-arrow-left"
        />
        <BaseButton
          variant="ghost"
          size="small"
          @click="goToBlog"
          label="Voir tous les posts"
        />
      </div>

      <!-- État de chargement -->
      <div v-if="isLoading" class="loading-state">
        <BaseSpinner size="large" />
        <p>Chargement du post...</p>
      </div>

      <!-- État d'erreur -->
      <EmptyState v-else-if="error" title="Erreur" :message="error">
        <template #action>
          <div class="error-actions">
            <BaseButton variant="primary" @click="loadPost" label="Réessayer" />
            <BaseButton
              variant="ghost"
              @click="goToBlog"
              label="Retour au blog"
            />
          </div>
        </template>
      </EmptyState>

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
/* Navigation */
.post-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border-secondary);
}

/* États de chargement */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 1rem;
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

/* Responsive */
@media (max-width: 768px) {
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
