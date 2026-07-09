<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import BlogPost from "./BlogPost.vue";
import { getAllPosts } from "../../services/posts";
import type { Post } from "../../lib/utils/types";

const props = defineProps<{
  filterTags?: string[];
}>();

const posts = ref<Post[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const fetchPosts = async () => {
  try {
    loading.value = true;
    error.value = null;
    const result = await getAllPosts();
    const postsArray = Array.isArray(result) ? result : [];

    // Trier les posts : is_highlight en premier, puis par date
    posts.value = postsArray.sort((a, b) => {
      // D'abord trier par is_highlight (true en premier)
      if (a.is_highlight && !b.is_highlight) return -1;
      if (!a.is_highlight && b.is_highlight) return 1;

      // Si même statut highlight, trier par date (plus récent en premier)
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  } catch (err) {
    error.value = "Erreur lors du chargement des posts";
    console.error("Erreur:", err);
    posts.value = []; // S'assurer que posts est toujours un tableau
  } finally {
    loading.value = false;
  }
};

// Fonction helper pour obtenir le nom du tag
const getTagName = (tag: string | { name: string }): string => {
  return typeof tag === "string" ? tag : tag.name;
};

// Filtrer les posts par tags sélectionnés
const filteredPosts = computed(() => {
  if (!props.filterTags || props.filterTags.length === 0) {
    return posts.value;
  }

  return posts.value.filter((post) => {
    if (!post.tags || post.tags.length === 0) return false;
    // Vérifier si le post contient AU MOINS un des tags sélectionnés
    return props.filterTags!.some((filterTag) =>
      post.tags!.some(
        (postTag) =>
          getTagName(postTag).toLowerCase() === filterTag.toLowerCase(),
      ),
    );
  });
});

onMounted(() => {
  fetchPosts();
});
</script>
<template>
  <div class="posts-container">
    <div v-if="loading" class="loading">Chargement des posts...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <!-- Indicateur de filtre actif -->
      <div v-if="filterTags && filterTags.length > 0" class="filter-indicator">
        Filtré par :
        <span v-for="tag in filterTags" :key="tag" class="filter-tag"
          >#{{ tag }}</span
        >
        <span class="filter-count"
          >({{ filteredPosts.length }} post{{
            filteredPosts.length > 1 ? "s" : ""
          }})</span
        >
      </div>

      <BlogPost
        v-for="post in filteredPosts"
        :key="post.id"
        :post="post"
        @refresh="fetchPosts"
      />
      <div
        v-if="filteredPosts.length === 0 && filterTags && filterTags.length > 0"
        class="no-posts"
      >
        Aucun post avec ces tags
      </div>
      <div v-else-if="filteredPosts.length === 0" class="no-posts">
        Aucun post disponible
      </div>
    </div>
  </div>
</template>
<style scoped>
.filter-indicator {
  background: var(--color-bg-primary-dark);
  border: 1px solid var(--color-accent);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  color: var(--color-white);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-tag {
  background: var(--color-accent);
  color: var(--color-black);
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.85em;
  font-weight: 500;
}

.filter-count {
  color: var(--color-secondary);
  font-size: 0.9em;
  margin-left: auto;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .filter-indicator {
    padding: 10px 12px;
    margin-bottom: 12px;
    gap: 6px;
    font-size: 0.9em;
  }

  .filter-tag {
    font-size: 0.8em;
    padding: 3px 8px;
  }

  .filter-count {
    font-size: 0.85em;
    margin-left: auto;
  }
}

@media (max-width: 768px) {
  .filter-indicator {
    padding: 8px 10px;
    margin-bottom: 10px;
    gap: 4px;
    font-size: 0.85em;
  }

  .filter-tag {
    font-size: 0.75em;
    padding: 2px 6px;
  }

  .filter-count {
    font-size: 0.8em;
  }
}

@media (max-width: 640px) {
  .filter-indicator {
    padding: 6px 8px;
    margin-bottom: 8px;
    gap: 3px;
    font-size: 0.75em;
    flex-direction: column;
    align-items: flex-start;
  }

  .filter-tag {
    font-size: 0.7em;
    padding: 2px 4px;
  }

  .filter-count {
    font-size: 0.7em;
    margin-left: 0;
    width: 100%;
  }
}
</style>
