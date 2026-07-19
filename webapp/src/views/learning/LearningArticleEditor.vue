<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { MdEditor } from "md-editor-v3";
import "md-editor-v3/lib/style.css";
import {
  getArticleBySlugOrId,
  createArticle,
  updateArticle,
  uploadLearningImage,
} from "../../services/learning";
import { useToast } from "../../composables/useToast";
import AppLayout from "../../layouts/AppLayout.vue";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseInput from "../../components/ui/BaseInput.vue";
import BaseSelect from "../../components/ui/BaseSelect.vue";
import BaseSpinner from "../../components/ui/BaseSpinner.vue";
import FormField from "../../components/ui/FormField.vue";
import CoverImageModal from "../../components/learning/CoverImageModal.vue";
import type { LearningArticle } from "../../lib/utils/types";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const articleId = computed(() =>
  Array.isArray(route.params.id) ? route.params.id[0] : route.params.id,
);
const isEditing = computed(() => !!articleId.value);

const isLoading = ref(isEditing.value);
const isSaving = ref(false);
const showCoverModal = ref(false);

const title = ref("");
const excerpt = ref("");
const coverImage = ref("");
const body = ref("");
const status = ref<"draft" | "published">("draft");

const statusOptions = [
  { value: "draft", label: "Brouillon" },
  { value: "published", label: "Publié" },
];

const loadArticle = async () => {
  if (!articleId.value) return;

  try {
    isLoading.value = true;
    const article: LearningArticle = await getArticleBySlugOrId(
      articleId.value,
    );
    title.value = article.title;
    excerpt.value = article.excerpt || "";
    coverImage.value = article.coverImage || "";
    body.value = article.body;
    status.value = article.status;
  } catch (err) {
    console.error("Erreur lors du chargement de l'article:", err);
    toast.error("Impossible de charger l'article.");
    router.push("/learning");
  } finally {
    isLoading.value = false;
  }
};

const handleUploadImg = async (
  files: File[],
  callback: (urls: { url: string; alt: string; title: string }[]) => void,
) => {
  try {
    const uploaded = await Promise.all(
      files.map(async (file) => {
        const url = await uploadLearningImage(file);
        return { url, alt: file.name, title: file.name };
      }),
    );
    callback(uploaded);
  } catch (err) {
    console.error("Erreur lors de l'upload d'image:", err);
    toast.error("Erreur lors de l'upload de l'image.");
  }
};

const save = async () => {
  if (!title.value.trim() || !body.value.trim()) {
    toast.error("Le titre et le contenu sont requis.");
    return;
  }

  try {
    isSaving.value = true;
    const payload = {
      title: title.value,
      body: body.value,
      excerpt: excerpt.value || undefined,
      coverImage: coverImage.value || undefined,
      status: status.value,
    };

    const saved = isEditing.value
      ? await updateArticle(articleId.value as string, payload)
      : await createArticle(payload);

    toast.success("Article enregistré.");
    router.push(`/learning/${saved.slug}`);
  } catch (err) {
    console.error("Erreur lors de l'enregistrement:", err);
    toast.error("Erreur lors de l'enregistrement de l'article.");
  } finally {
    isSaving.value = false;
  }
};

onMounted(loadArticle);
</script>

<template>
  <AppLayout>
    <div class="page-container">
      <header class="editor-header">
        <h1 class="main-title">
          {{ isEditing ? "Modifier l'article" : "Nouvel article" }}
        </h1>
        <div class="header-actions">
          <BaseButton
            variant="ghost"
            @click="router.push('/learning')"
            label="Annuler"
          />
          <BaseButton
            variant="secondary"
            :loading="isSaving"
            @click="save"
            label="Enregistrer"
          />
        </div>
      </header>

      <div v-if="isLoading" class="loading-state">
        <BaseSpinner size="large" />
      </div>

      <div v-else class="editor-form">
        <FormField label="Titre" html-for="learning-title">
          <BaseInput
            id="learning-title"
            v-model="title"
            placeholder="Titre de l'article"
          />
        </FormField>

        <FormField label="Résumé" html-for="learning-excerpt">
          <BaseInput
            id="learning-excerpt"
            v-model="excerpt"
            placeholder="Court résumé affiché dans la liste"
          />
        </FormField>

        <FormField label="Image de couverture">
          <div class="cover-field">
            <img
              v-if="coverImage"
              :src="coverImage"
              alt="Aperçu de l'image de couverture"
              class="cover-preview-thumb"
            />
            <BaseButton
              type="button"
              variant="ghost"
              @click="showCoverModal = true"
              :label="coverImage ? 'Changer l\'image' : 'Ajouter une image'"
            />
            <BaseButton
              v-if="coverImage"
              type="button"
              variant="outline"
              size="small"
              @click="coverImage = ''"
              label="Retirer"
            />
          </div>
        </FormField>

        <FormField label="Statut" html-for="learning-status">
          <BaseSelect
            id="learning-status"
            v-model="status"
            :options="statusOptions"
          />
        </FormField>

        <FormField label="Contenu">
          <MdEditor
            v-model="body"
            theme="dark"
            :on-upload-img="handleUploadImg"
          />
        </FormField>
      </div>
    </div>
  </AppLayout>

  <CoverImageModal
    v-model="showCoverModal"
    @confirm="(url) => (coverImage = url)"
  />
</template>

<style scoped>
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 32px;
}

.main-title {
  font-size: 2rem;
  color: var(--color-white);
  margin: 0;
  letter-spacing: -1px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 3rem 1rem;
}

.editor-form {
  display: flex;
  flex-direction: column;
}

.cover-field {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.cover-preview-thumb {
  width: 120px;
  height: 68px;
  object-fit: cover;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-secondary);
}
</style>
