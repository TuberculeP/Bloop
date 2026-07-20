<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/authStore";
import { getAllArticles } from "../../services/learning";
import AppLayout from "../../layouts/AppLayout.vue";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseInput from "../../components/ui/BaseInput.vue";
import BaseSelect from "../../components/ui/BaseSelect.vue";
import BaseSpinner from "../../components/ui/BaseSpinner.vue";
import EmptyState from "../../components/ui/EmptyState.vue";
import { formatLongDate } from "../../lib/utils/dateFormatter";
import type { LearningArticle } from "../../lib/utils/types";

const router = useRouter();
const authStore = useAuthStore();
const isAdmin = computed(() => authStore.user?.role === "ROLE_ADMIN");

const articles = ref<LearningArticle[]>([]);
const isLoading = ref(true);
const searchQuery = ref("");
const sortBy = ref<"recent" | "votes">("recent");

const sortOptions = [
  { value: "recent", label: "Plus récents" },
  { value: "votes", label: "Mieux notés" },
];

const loadArticles = async () => {
  isLoading.value = true;
  articles.value = await getAllArticles({
    q: searchQuery.value || undefined,
    sort: sortBy.value,
  });
  isLoading.value = false;
};

let searchDebounce: ReturnType<typeof setTimeout> | undefined;
watch([searchQuery, sortBy], () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(loadArticles, 300);
});

onMounted(loadArticles);
</script>

<template>
  <AppLayout>
    <div class="page-container">
      <header class="learning-header">
        <div>
          <h1 class="main-title">Learning</h1>
          <p class="tagline">Articles et tutoriels pour progresser sur Bloop</p>
        </div>
        <BaseButton
          v-if="isAdmin"
          variant="accent"
          @click="router.push('/learning/editor/new')"
        >
          <i class="fas fa-plus"></i>
          Nouvel article
        </BaseButton>
      </header>

      <div class="learning-toolbar">
        <BaseInput
          v-model="searchQuery"
          placeholder="Rechercher un article..."
        />
        <BaseSelect
          v-model="sortBy"
          :options="sortOptions"
          class="sort-select"
        />
      </div>

      <div v-if="isLoading" class="loading-state">
        <BaseSpinner size="large" />
      </div>

      <EmptyState
        v-else-if="articles.length === 0"
        icon="fas fa-graduation-cap"
        :title="searchQuery ? 'Aucun résultat' : 'Aucun article pour le moment'"
        :message="
          searchQuery
            ? 'Essayez une autre recherche.'
            : 'Revenez bientôt pour découvrir nos premiers contenus.'
        "
      />

      <div v-else class="articles-grid">
        <article
          v-for="article in articles"
          :key="article.id"
          class="article-card"
          @click="router.push(`/learning/${article.slug}`)"
        >
          <div
            v-if="article.coverImage"
            class="article-cover"
            :style="{ backgroundImage: `url(${article.coverImage})` }"
          ></div>
          <div class="article-body">
            <h2 class="article-title">{{ article.title }}</h2>
            <p v-if="article.excerpt" class="article-excerpt">
              {{ article.excerpt }}
            </p>
            <div class="article-meta">
              <span class="article-meta-info">
                <span
                  >{{ article.author?.firstName }}
                  {{ article.author?.lastName }}</span
                >
                <span>{{ formatLongDate(article.publishedAt) }}</span>
              </span>
              <span class="article-score">
                <i class="fas fa-arrow-up"></i>
                {{ article.score ?? 0 }}
              </span>
            </div>
          </div>
        </article>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.learning-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 40px;
}

.main-title {
  font-size: 2.5rem;
  color: var(--color-white);
  margin: 0;
  letter-spacing: -1px;
}

.learning-toolbar {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}

.learning-toolbar :deep(.base-input) {
  flex: 1;
  min-width: 220px;
}

.sort-select {
  max-width: 220px;
}

.tagline {
  color: var(--color-white-light);
  opacity: 0.7;
  margin: 8px 0 0 0;
  font-size: 1.1rem;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 3rem 1rem;
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.article-card {
  background: var(--color-bg-secondary-dark);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-xl);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.article-card:hover {
  border-color: var(--color-accent3-hover);
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.article-cover {
  height: 160px;
  background-size: cover;
  background-position: center;
}

.article-body {
  padding: 20px;
}

.article-title {
  font-size: 1.25rem;
  color: var(--color-white);
  margin: 0 0 8px;
}

.article-excerpt {
  color: var(--color-white-light);
  opacity: 0.8;
  font-size: 0.9rem;
  margin: 0 0 16px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 0.8rem;
  color: var(--color-white-light);
  opacity: 0.6;
}

.article-meta-info {
  display: flex;
  gap: 12px;
  min-width: 0;
}

.article-meta-info span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.article-score {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  font-weight: 600;
  color: var(--color-white-light);
}
</style>
