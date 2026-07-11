<script setup lang="ts">
import { ref, onMounted } from "vue";
import BlogCreate from "./BlogCreate.vue";
import BlogPosts from "./BlogPosts.vue";
import BlogTrends from "./BlogTrends.vue";
import { useAuthStore } from "../../stores/authStore";
import BlogSearch from "./BlogSearch.vue";
import apiClient from "../../lib/utils/apiClient";
import type { User } from "../../lib/utils/types";
import BlogTopLikedUsers from "./BlogTopLikedUsers.vue";
import BlogBackground from "./BlogBackground.vue";

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

const handleFiltersCleared = () => {
  selectedTagsFilter.value = [];
};

onMounted(() => {
  checkAuthentication();
});
</script>
<template>
  <div class="blog-container">
    <div class="blog-background">
      <BlogBackground />
    </div>
    <div class="blog-users">
      <BlogTopLikedUsers />
    </div>
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
        @filtersCleared="handleFiltersCleared"
      />
    </div>
  </div>
</template>
<style scoped>
.blog-container {
  position: relative;
  /* background: var(--color-bg-primary-dark); */

  padding: 24px;
  display: flex;
  gap: 16px;
  /*   overflow: hidden; */

  .blog-background {
    position: fixed;
    inset: 0;
    z-index: 0;
    background: linear-gradient(
      180deg,
      var(--color-bg-primary-dark) 0%,

      var(--color-accent3) 100%
    );
  }

  .blog-content,
  .blog-trends,
  .blog-users {
    position: relative;
    z-index: 1;
  }

  .blog-content {
    flex: 1 1 auto;
  }

  .blog-trends {
    flex: 0 0 400px; /* Largeur fixe pour la colonne des tendances */
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .blog-users {
    flex: 0 0 250px; /* Largeur fixe pour la colonne des tendances */
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
}

/* Tablette et petit écran */
@media (max-width: 1200px) {
  .blog-container {
    .blog-trends,
    .blog-users {
      flex: 0 0 320px;
    }
  }
}

/* Tablette */
@media (max-width: 1024px) {
  .blog-container {
    flex-wrap: wrap;
    padding: 32px 16px;

    .blog-content {
      flex: 1 1 100%;
      order: 2;
    }

    .blog-trends,
    .blog-users {
      flex: 1 1 calc(50% - 8px);
      order: 1;
      gap: 16px;
    }

    .blog-users {
      order: 1;
    }

    .blog-trends {
      order: 3;
    }
  }
}

/* Mobile grand (768px - 1023px) */
@media (max-width: 768px) {
  .blog-container {
    flex-direction: column;
    padding: 24px 16px;
    gap: 24px;

    .blog-content {
      order: 1;
      flex: 1 1 100%;
    }

    .blog-trends,
    .blog-users {
      flex: 1 1 100%;
      order: 2;
      gap: 16px;
    }

    .blog-users {
      order: 2;
    }

    .blog-trends {
      order: 3;
    }
  }
}

/* Mobile petit (< 640px) */
@media (max-width: 640px) {
  .blog-container {
    flex-direction: column;
    padding: 16px 12px;
    gap: 16px;

    .blog-content {
      order: 1;
    }

    .blog-trends,
    .blog-users {
      flex: 1 1 100%;
      order: 2;
      gap: 12px;
    }

    .blog-users {
      order: 2;
    }

    .blog-trends {
      order: 3;
    }
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
