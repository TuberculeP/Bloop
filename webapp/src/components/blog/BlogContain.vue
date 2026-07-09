<script setup lang="ts">
import { ref, onMounted } from "vue";
import BlogCreate from "./BlogCreate.vue";
import BlogPosts from "./BlogPosts.vue";
import BlogTrends from "./BlogTrends.vue";
import { useAuthStore } from "../../stores/authStore";
import BlogSearch from "./BlogSearch.vue";
import apiClient from "../../lib/utils/apiClient";
import type { User } from "../../lib/utils/types";
// import BlogUsers from "./BlogUsers.vue";

const postsKey = ref(0);
const isAuthenticated = ref(false);
const authStore = useAuthStore();
const selectedTagsFilter = ref<string[]>([]);

// Vérifier si l'utilisateur est connecté
const checkAuthentication = async () => {
  const { data, error } = await apiClient.get<{ user: User }>("/auth/check");
  if (error || !data) {
    isAuthenticated.value = false;
    return;
  }
  isAuthenticated.value = !!data.user; // true si user existe
  if (data.user) {
    authStore.user = data.user;
  }
};

const handlePostCreated = () => {
  // Force le rechargement de la liste des posts
  postsKey.value++;
};

// Gestion du filtrage par tags
const handleTagSelected = (tag: string) => {
  if (!selectedTagsFilter.value.includes(tag)) {
    selectedTagsFilter.value.push(tag);
  }
};

const handleTagDeselected = (tag: string) => {
  selectedTagsFilter.value = selectedTagsFilter.value.filter((t) => t !== tag);
};

onMounted(() => {
  checkAuthentication();
});
</script>
<template>
  <div class="blog-container">
    <div class="blog-content">
      <!-- Afficher le formulaire seulement si connecté -->
      <BlogCreate v-if="isAuthenticated" @postCreated="handlePostCreated" />

      <!-- Message pour les non-connectés -->
      <div v-else class="login-prompt">
        <p>Connectez-vous pour créer un post</p>
        <router-link to="/login" class="login-link">Se connecter</router-link>
      </div>

      <BlogPosts :key="postsKey" :filterTags="selectedTagsFilter" />
    </div>
    <div class="blog-trends">
      <BlogSearch />
      <BlogTrends
        @tagSelected="handleTagSelected"
        @tagDeselected="handleTagDeselected"
      />
      <!-- <BlogUsers /> -->
    </div>
  </div>
</template>
<style scoped>
.blog-container {
  padding: 40px 24px;
  margin: 0 32px;
  display: flex;
  gap: 16px;

  .blog-content {
    flex: 1 1 auto;
  }

  .blog-trends {
    flex: 0 0 400px; /* Largeur fixe pour la colonne des tendances */
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
}

.admin-test-controls {
  background: var(--color-bg-primary);
  border: 2px dashed var(--color-accent);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  text-align: center;
}

.test-admin-button {
  background: var(--color-secondary);
  color: var(--color-white);
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  margin-bottom: 8px;
}

.test-admin-button:hover {
  background: var(--color-secondary-hover);
  transform: translateY(-1px);
}

.test-admin-button.active {
  background: var(--color-accent);
  box-shadow: 0 4px 12px
    color-mix(in srgb, var(--color-secondary) 30%, transparent);
}

.test-warning {
  display: block;
  color: var(--color-secondary);
  font-style: italic;
  margin-top: 4px;
}

.login-prompt {
  background: var(--color-bg-primary-dark);
  border: 1px solid var(--color-primary);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  text-align: center;
  color: var(--color-white);
}

.login-link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
}

.login-link:hover {
  color: var(--color-primary-hover);
}
</style>
