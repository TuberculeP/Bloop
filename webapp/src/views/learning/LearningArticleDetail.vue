<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { MdPreview } from "md-editor-v3";
import "md-editor-v3/lib/preview.css";
import { useAuthStore } from "../../stores/authStore";
import {
  getArticleBySlugOrId,
  deleteArticle,
  voteArticle,
} from "../../services/learning";
import { useToast } from "../../composables/useToast";
import AppLayout from "../../layouts/AppLayout.vue";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseModal from "../../components/ui/BaseModal.vue";
import BaseSpinner from "../../components/ui/BaseSpinner.vue";
import EmptyState from "../../components/ui/EmptyState.vue";
import { formatLongDate } from "../../lib/utils/dateFormatter";
import type { LearningArticle } from "../../lib/utils/types";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const isAdmin = computed(() => authStore.user?.role === "ROLE_ADMIN");

const article = ref<LearningArticle | null>(null);
const isLoading = ref(true);
const error = ref<string | null>(null);
const showDeleteConfirm = ref(false);

const slugOrId = computed(() =>
  Array.isArray(route.params.slug) ? route.params.slug[0] : route.params.slug,
);

const loadArticle = async () => {
  try {
    isLoading.value = true;
    error.value = null;
    article.value = await getArticleBySlugOrId(slugOrId.value as string);
  } catch (err) {
    console.error("Erreur lors du chargement de l'article:", err);
    error.value = "Article introuvable";
    article.value = null;
  } finally {
    isLoading.value = false;
  }
};

const handleVote = async (value: 1 | -1) => {
  if (!article.value?.id) return;
  const previousScore = article.value.score ?? 0;
  const previousVote = article.value.myVote ?? 0;

  try {
    const result = await voteArticle(article.value.id, value);
    article.value.score = result.score;
    article.value.myVote = result.myVote;
  } catch (err) {
    console.error("Erreur lors du vote:", err);
    toast.error("Erreur lors du vote.");
    article.value.score = previousScore;
    article.value.myVote = previousVote;
  }
};

const confirmDelete = async () => {
  if (!article.value?.id) return;

  try {
    await deleteArticle(article.value.id);
    toast.success("Article supprimé.");
    router.push("/learning");
  } catch (err) {
    console.error("Erreur lors de la suppression:", err);
    toast.error("Erreur lors de la suppression de l'article.");
  } finally {
    showDeleteConfirm.value = false;
  }
};

onMounted(loadArticle);
</script>

<template>
  <AppLayout>
    <div class="page-container">
      <div class="article-navigation">
        <BaseButton
          variant="ghost"
          @click="router.push('/learning')"
          label="Tous les articles"
          left-icon="fas fa-arrow-left"
        />
        <div v-if="isAdmin && article" class="admin-actions">
          <BaseButton
            variant="outline"
            @click="router.push(`/learning/editor/${article.id}`)"
            left-icon="fas fa-pencil-alt"
            label="Modifier"
          />
          <BaseButton
            color="error"
            @click="showDeleteConfirm = true"
            left-icon="fas fa-trash-alt"
            label="Supprimer"
          />
        </div>
      </div>

      <div v-if="isLoading" class="loading-state">
        <BaseSpinner size="large" />
      </div>

      <EmptyState v-else-if="error" title="Erreur" :message="error" />

      <div v-else-if="article" class="article-content">
        <header class="article-header">
          <h1 class="article-title">{{ article.title }}</h1>
          <div class="article-meta">
            <span
              >{{ article.author?.firstName }}
              {{ article.author?.lastName }}</span
            >
            <span>{{ formatLongDate(article.publishedAt) }}</span>
          </div>

          <div class="vote-control">
            <button
              type="button"
              class="vote-btn"
              :class="{ active: article.myVote === 1 }"
              aria-label="Voter pour"
              @click="handleVote(1)"
            >
              <i class="fas fa-arrow-up"></i>
            </button>
            <span class="vote-score">{{ article.score ?? 0 }}</span>
            <button
              type="button"
              class="vote-btn"
              :class="{ active: article.myVote === -1 }"
              aria-label="Voter contre"
              @click="handleVote(-1)"
            >
              <i class="fas fa-arrow-down"></i>
            </button>
          </div>

          <div
            v-if="article.coverImage"
            class="article-cover"
            :style="{ backgroundImage: `url(${article.coverImage})` }"
          ></div>
        </header>

        <MdPreview
          :model-value="article.body"
          :editor-id="`learning-article-${article.id}`"
          theme="dark"
        />
      </div>
    </div>
  </AppLayout>

  <BaseModal v-model="showDeleteConfirm">
    <template #header>
      <h3>Supprimer l'article ?</h3>
    </template>
    <p>Cette action est irréversible.</p>
    <template #footer>
      <BaseButton
        variant="secondary"
        @click="showDeleteConfirm = false"
        label="Annuler"
      />
      <BaseButton variant="danger" @click="confirmDelete" label="Supprimer" />
    </template>
  </BaseModal>
</template>

<style scoped>
.article-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border-secondary);
  flex-wrap: wrap;
  gap: 1rem;
}

.admin-actions {
  display: flex;
  gap: 12px;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 3rem 1rem;
}

.article-header {
  margin-bottom: 32px;
}

.article-title {
  font-size: 2.25rem;
  color: var(--color-white);
  margin: 0 0 12px;
  letter-spacing: -0.5px;
}

.article-meta {
  display: flex;
  gap: 16px;
  font-size: 0.9rem;
  color: var(--color-white-light);
  opacity: 0.7;
  margin-bottom: 20px;
}

.article-cover {
  height: 320px;
  border-radius: var(--radius-xl);
  background-size: cover;
  background-position: center;
  margin-top: 20px;
}

.vote-control {
  display: flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
}

.vote-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-md);
  color: var(--color-white-light);
  cursor: pointer;
  transition: all 0.2s ease;
}

.vote-btn:hover {
  border-color: var(--color-accent3-hover);
  color: var(--color-white);
}

.vote-btn.active {
  background: var(--color-accent3);
  border-color: var(--color-accent3);
  color: var(--color-white);
}

.vote-score {
  min-width: 24px;
  text-align: center;
  font-weight: 600;
  color: var(--color-white);
}
</style>
