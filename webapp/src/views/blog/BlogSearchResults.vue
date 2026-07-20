<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getAllPosts } from "../../services/posts";
import BlogPost from "../../components/blog/BlogPost.vue";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseSpinner from "../../components/ui/BaseSpinner.vue";
import EmptyState from "../../components/ui/EmptyState.vue";
import type { Post } from "../../lib/utils/types";
import AppLayout from "../../layouts/AppLayout.vue";

const route = useRoute();
const router = useRouter();

const searchQuery = ref("");
const allPosts = ref<Post[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

// Récupérer la query depuis l'URL
const getSearchQuery = () => {
  return (route.query.q as string) || "";
};

// Helper pour obtenir le nom d'un tag (string ou objet)
const getTagName = (tag: string | { name: string }): string => {
  return typeof tag === "string" ? tag : tag.name;
};

// Filtrer les posts selon la recherche (body + tags)
const filteredPosts = computed(() => {
  if (!searchQuery.value.trim()) return [];

  const query = searchQuery.value.toLowerCase().trim();
  return allPosts.value.filter((post) => {
    // Recherche dans le contenu
    const bodyMatch = post.body.toLowerCase().includes(query);

    // Recherche dans les tags
    const tagsMatch =
      post.tags?.some((tag) => {
        const tagName = getTagName(tag);
        return tagName.toLowerCase().includes(query);
      }) || false;

    return bodyMatch || tagsMatch;
  });
});

// Statistiques de recherche
const searchStats = computed(() => {
  const total = filteredPosts.value.length;
  const query = searchQuery.value.trim();

  return {
    total,
    query,
    hasResults: total > 0,
    isEmpty: !query,
  };
});

// Charger tous les posts
const fetchPosts = async () => {
  try {
    loading.value = true;
    error.value = null;

    const result = await getAllPosts();
    allPosts.value = Array.isArray(result) ? result : [];
  } catch (err) {
    error.value = "Erreur lors du chargement des posts";
    console.error("Erreur:", err);
  } finally {
    loading.value = false;
  }
};

// Nouvelle recherche
const handleNewSearch = () => {
  router.push({ name: "app-blog" });
};

// Watcher pour les changements d'URL
watch(
  () => route.query.q,
  (newQuery) => {
    searchQuery.value = (newQuery as string) || "";
  },
  { immediate: true },
);

onMounted(() => {
  searchQuery.value = getSearchQuery();
  fetchPosts();
});
</script>

<template>
  <AppLayout>
    <div class="page-container">
      <!-- Header avec informations de recherche -->
      <div class="search-header">
        <div class="search-info">
          <h2>Résultats de recherche</h2>
          <div v-if="!searchStats.isEmpty" class="search-query">
            Recherche pour : <strong>"{{ searchStats.query }}"</strong>
          </div>
        </div>

        <BaseButton
          variant="ghost"
          size="small"
          @click="handleNewSearch"
          color="secondary"
        >
          ← Nouvelle recherche
        </BaseButton>
      </div>
      <!-- Statistiques et état -->
      <div class="search-stats">
        <div v-if="loading" class="loading">
          <BaseSpinner size="large" color="primary" />
          <p>Recherche en cours...</p>
        </div>

        <div v-else-if="error" class="error">
          <p>{{ error }}</p>
          <BaseButton variant="ghost" size="small" @click="fetchPosts">
            Réessayer
          </BaseButton>
        </div>

        <EmptyState
          v-else-if="searchStats.isEmpty"
          icon="fas fa-search"
          title="Aucune recherche"
          message="Utilisez la barre de recherche pour trouver des posts."
        />

        <EmptyState
          v-else-if="!searchStats.hasResults"
          icon="fas fa-search"
          title="Aucun résultat trouvé"
          :message="`Aucun post ne correspond à votre recherche « ${searchStats.query} ».`"
        >
          <div class="suggestions">
            <h4>Suggestions :</h4>
            <ul>
              <li>Vérifiez l'orthographe de vos mots-clés</li>
              <li>Essayez des termes plus généraux</li>
              <li>Utilisez des mots-clés différents</li>
            </ul>
          </div>
        </EmptyState>

        <div v-else class="results-count">
          <p>
            <strong>{{ searchStats.total }}</strong>
            {{
              searchStats.total === 1 ? "résultat trouvé" : "résultats trouvés"
            }}
          </p>
        </div>
      </div>

      <!-- Liste des résultats -->
      <div v-if="searchStats.hasResults" class="search-results">
        <BlogPost
          v-for="post in filteredPosts"
          :key="post.id"
          :post="post"
          @refresh="fetchPosts"
          class="search-result-item"
        />
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.search-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--color-border-secondary);
}

.search-info h2 {
  color: var(--color-white);
  margin: 0 0 8px 0;
  font-size: 1.8rem;
}

.search-query {
  color: var(--color-secondary);
  font-size: 0.9rem;
}

.search-query strong {
  color: var(--color-white);
}

.search-stats {
  margin-bottom: 24px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  color: var(--color-secondary);
}

.error {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-error);
}

.suggestions {
  margin-top: 24px;
  text-align: left;
  max-width: 300px;
  margin-left: auto;
  margin-right: auto;
}

.suggestions h4 {
  color: var(--color-white);
  margin: 0 0 12px 0;
  font-size: 1rem;
}

.suggestions ul {
  margin: 0;
  padding-left: 20px;
  list-style-type: disc;
}

.suggestions li {
  margin-bottom: 6px;
  opacity: 0.8;
}

.results-count {
  text-align: center;
  padding: 16px;
  background-color: var(--color-bg-secondary-dark);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-secondary);
}

.results-count p {
  margin: 0;
  color: var(--color-white);
  font-size: 0.9rem;
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-result-item {
  position: relative;
}

.search-result-item::before {
  content: "";
  position: absolute;
  left: -4px;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--color-primary);
  border-radius: 2px;
}

/* Responsive */
@media (max-width: 768px) {
  .search-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
}
</style>
