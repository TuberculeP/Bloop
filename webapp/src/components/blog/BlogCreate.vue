<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { createPost } from "../../services/posts";
import { getAllTags, defaultTags, type Tag } from "../../services/tags";
import type { CreatePostData } from "../../lib/utils/types";
import BaseButton from "../ui/BaseButton.vue";
import FormField from "../ui/FormField.vue";
import { useToast } from "../../composables/useToast";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const emit = defineEmits<{
  postCreated: [];
}>();

const form = ref({
  body: "",
  is_highlight: false,
  highlight_on_tag: false,
  pinned_by_user: false,
});

// Gestion des tags
const selectedTags = ref<string[]>([]);
const tagInput = ref("");
const showSuggestions = ref(false);
const availableTags = ref<string[]>([...defaultTags]);

// Charger les tags depuis le serveur au montage
onMounted(async () => {
  try {
    const serverTags = await getAllTags();
    const serverTagNames = serverTags.map((t: Tag) => t.name);
    // Fusionner avec les tags par défaut sans doublons
    availableTags.value = [
      ...new Set([...defaultTags, ...serverTagNames]),
    ].sort();
  } catch (error) {
    console.error("Erreur lors du chargement des tags:", error);
  }

  // Pré-remplissage depuis un lien "Partager sur le blog" (ex: séquenceur)
  const shareText = route.query.shareText;
  if (typeof shareText === "string") {
    form.value.body = shareText;
    router.replace({ query: {} });
  }
});

// État pour afficher tous les tags (double-clic)
const showAllTags = ref(false);

// Filtrer les suggestions basées sur l'input
const filteredSuggestions = computed(() => {
  // Si showAllTags est activé, afficher tous les tags non sélectionnés
  if (showAllTags.value) {
    return availableTags.value
      .filter((tag) => !selectedTags.value.includes(tag))
      .slice(0, 15); // Limiter à 15 suggestions pour le dropdown complet
  }

  if (!tagInput.value.trim()) return [];
  const search = tagInput.value.toLowerCase();
  return availableTags.value
    .filter(
      (tag) =>
        tag.toLowerCase().includes(search) && !selectedTags.value.includes(tag),
    )
    .slice(0, 8); // Limiter à 8 suggestions
});

// Ajouter un tag
const addTag = (tag: string) => {
  const trimmedTag = tag.trim();
  if (trimmedTag && !selectedTags.value.includes(trimmedTag)) {
    selectedTags.value.push(trimmedTag);
  }
  tagInput.value = "";
  showSuggestions.value = false;
  showAllTags.value = false;
};

// Toggle pour afficher/masquer tous les tags
const toggleShowAllTags = () => {
  showAllTags.value = !showAllTags.value;
};

// Gérer le blur de l'input tags (avec délai pour permettre le clic sur les suggestions)
const handleTagInputBlur = () => {
  window.setTimeout(() => {
    showSuggestions.value = false;
  }, 200);
};

// Supprimer un tag
const removeTag = (tag: string) => {
  selectedTags.value = selectedTags.value.filter((t) => t !== tag);
};

// Gérer la touche Enter dans l'input
const handleTagKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter") {
    event.preventDefault();
    if (tagInput.value.trim()) {
      addTag(tagInput.value);
    }
  } else if (
    event.key === "Backspace" &&
    !tagInput.value &&
    selectedTags.value.length > 0
  ) {
    // Supprimer le dernier tag si on appuie sur Backspace avec un input vide
    selectedTags.value.pop();
  }
};

const loading = ref(false);
const bodyError = ref<string | null>(null);

const handleSubmit = async () => {
  if (!form.value.body.trim()) {
    bodyError.value = "Le contenu est requis";
    return;
  }

  try {
    loading.value = true;
    bodyError.value = null;

    const postData: CreatePostData = {
      body: form.value.body.trim(),
      tags: selectedTags.value,
      is_highlight: form.value.is_highlight,
    };

    await createPost(postData);

    // Réinitialiser le formulaire
    form.value = {
      body: "",
      is_highlight: false,
      highlight_on_tag: false,
      pinned_by_user: false,
    };
    selectedTags.value = [];
    tagInput.value = "";

    emit("postCreated");
  } catch (err) {
    toast.error("Erreur lors de la création du post.");
    console.error("Erreur:", err);
  } finally {
    loading.value = false;
  }
};
</script>
<template>
  <div class="post-create">
    <h2>Ajouter un nouveau post</h2>

    <form @submit.prevent="handleSubmit" class="create-form">
      <FormField
        label="Contenu*"
        html-for="body"
        :error="bodyError ?? undefined"
      >
        <textarea
          id="body"
          v-model="form.body"
          placeholder="Écrivez votre post..."
          rows="4"
          required
        ></textarea>
      </FormField>

      <FormField label="Ajouter des Tags" html-for="tags">
        <div class="tags-input-container">
          <!-- Tags sélectionnés -->
          <div class="selected-tags">
            <span v-for="tag in selectedTags" :key="tag" class="tag-badge">
              {{ tag }}
              <button type="button" class="tag-remove" @click="removeTag(tag)">
                ×
              </button>
            </span>
          </div>
          <!-- Input avec autocomplétion -->
          <div class="tag-input-wrapper">
            <div class="tag-input-row">
              <input
                id="tags"
                v-model="tagInput"
                type="text"
                placeholder="Rechercher un tag..."
                @focus="showSuggestions = true"
                @blur="handleTagInputBlur"
                @keydown="handleTagKeydown"
                @input="showAllTags = false"
                autocomplete="off"
              />
              <BaseButton
                type="button"
                size="small"
                :variant="showAllTags ? 'accent' : 'lightghost'"
                @click="toggleShowAllTags"
                :label="showAllTags ? 'Masquer' : 'Voir les tags'"
              />
            </div>
            <!-- Liste des suggestions ou tous les tags -->
            <ul
              v-if="
                (showSuggestions && filteredSuggestions.length > 0) ||
                showAllTags
              "
              class="tag-suggestions"
              :class="{ 'show-all': showAllTags }"
            >
              <li
                v-for="suggestion in filteredSuggestions"
                :key="suggestion"
                @mousedown.prevent="addTag(suggestion)"
                class="tag-suggestion-item"
              >
                {{ suggestion }}
              </li>
            </ul>
          </div>
        </div>
      </FormField>
      <div>
        <BaseButton
          type="submit"
          variant="secondary"
          size="normal"
          :disabled="loading"
          :loading="loading"
          label="Poster"
        />
      </div>
    </form>
  </div>
</template>
