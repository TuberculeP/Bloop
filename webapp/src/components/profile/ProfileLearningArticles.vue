<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getMyArticles, deleteArticle } from "../../services/learning";
import { useToast } from "../../composables/useToast";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseBadge from "../../components/ui/BaseBadge.vue";
import BaseModal from "../../components/ui/BaseModal.vue";
import EmptyState from "../../components/ui/EmptyState.vue";
import type { LearningArticle } from "../../lib/utils/types";

const toast = useToast();
const router = useRouter();

const articles = ref<LearningArticle[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const pendingDeleteId = ref<string | null>(null);

const loadArticles = async () => {
  try {
    isLoading.value = true;
    error.value = null;
    articles.value = await getMyArticles();
  } catch (err) {
    console.error("Erreur lors du chargement des articles:", err);
    error.value = "Erreur lors du chargement de vos articles";
  } finally {
    isLoading.value = false;
  }
};

const cancelDelete = () => {
  pendingDeleteId.value = null;
};

const confirmDelete = async () => {
  if (!pendingDeleteId.value) return;
  const id = pendingDeleteId.value;

  try {
    await deleteArticle(id);
    articles.value = articles.value.filter((a) => a.id !== id);
  } catch (err) {
    console.error("Erreur lors de la suppression:", err);
    toast.error("Erreur lors de la suppression de l'article.");
  } finally {
    pendingDeleteId.value = null;
  }
};

onMounted(loadArticles);
</script>

<template>
  <div v-if="error" class="state-container error">
    <div class="error-box">
      <p>{{ error }}</p>
      <button @click="loadArticles" class="btn-text-accent">
        Réessayer le chargement
      </button>
    </div>
  </div>

  <div v-else-if="isLoading" class="state-container">
    <div class="loader-grid">
      <div class="skeleton-card" v-for="n in 3" :key="n"></div>
    </div>
  </div>

  <div v-else class="profile-learning-articles">
    <EmptyState
      v-if="articles.length === 0"
      icon="fas fa-graduation-cap"
      title="Aucun article pour le moment"
      message="Rédigez votre premier article Learning."
    >
      <template #action>
        <BaseButton
          variant="ghost"
          @click="router.push('/learning/editor/new')"
          label="Créer un article"
        />
      </template>
    </EmptyState>

    <div v-else class="articles-list">
      <div v-for="article in articles" :key="article.id" class="article-item">
        <div class="article-info">
          <div class="article-heading">
            <h3>{{ article.title }}</h3>
            <BaseBadge
              :variant="article.status === 'published' ? 'active' : 'neutral'"
            >
              {{ article.status === "published" ? "Publié" : "Brouillon" }}
            </BaseBadge>
          </div>
          <p v-if="article.excerpt" class="article-excerpt">
            {{ article.excerpt }}
          </p>
        </div>
        <div class="article-actions">
          <BaseButton
            variant="outline"
            size="small"
            @click="article.id && (pendingDeleteId = article.id)"
            left-icon="fas fa-trash-alt"
            label="Supprimer"
          />
          <BaseButton
            size="small"
            @click="router.push(`/learning/editor/${article.id}`)"
            label="Modifier"
            left-icon="fas fa-pencil-alt"
          />
        </div>
      </div>
    </div>

    <BaseModal
      :model-value="pendingDeleteId !== null"
      @update:model-value="cancelDelete"
    >
      <template #header>
        <h3>Supprimer l'article ?</h3>
      </template>
      <p>Cette action est irréversible.</p>
      <template #footer>
        <BaseButton variant="secondary" @click="cancelDelete" label="Annuler" />
        <BaseButton variant="danger" @click="confirmDelete" label="Supprimer" />
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.articles-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.article-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--color-bg-secondary-dark);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-xl);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.article-item:hover {
  border-color: var(--color-accent3-hover);
  box-shadow: var(--shadow-lg);
}

.article-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.article-heading h3 {
  margin: 0;
  color: var(--color-white);
  font-size: 1.1rem;
}

.article-excerpt {
  color: var(--color-white-light);
  opacity: 0.7;
  font-size: 0.9rem;
  margin: 8px 0 0;
}

.article-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

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
  height: 100px;
  background: var(--color-bg-secondary-dark);
  border-radius: var(--radius-xl);
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

.error-box {
  color: var(--color-white-light);
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

@media (max-width: 768px) {
  .article-item {
    flex-direction: column;
    align-items: stretch;
  }

  .article-actions {
    justify-content: flex-end;
  }
}
</style>
