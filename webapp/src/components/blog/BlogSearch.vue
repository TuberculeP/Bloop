<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import BaseButton from "../ui/BaseButton.vue";
import { getAllTags, defaultTags, type Tag } from "../../services/tags";

const router = useRouter();
const searchQuery = ref("");
const isSearching = ref(false);
const showTags = ref(false);
const availableTags = ref<string[]>([]);
const loadingTags = ref(false);

// Charger les tags au montage
onMounted(async () => {
  try {
    loadingTags.value = true;
    const serverTags = await getAllTags();
    const serverTagNames = serverTags.map((t: Tag) => t.name);
    availableTags.value = [
      ...new Set([...serverTagNames, ...defaultTags]),
    ].sort();
  } catch (error) {
    console.error("Erreur lors du chargement des tags:", error);
    availableTags.value = [...defaultTags];
  } finally {
    loadingTags.value = false;
  }
});

const handleSearch = async () => {
  if (!searchQuery.value.trim()) return;

  try {
    isSearching.value = true;

    // Rediriger vers la page de résultats avec la query en paramètre
    await router.push({
      name: "blog-search-results",
      query: { q: searchQuery.value.trim() },
    });
  } catch (error) {
    console.error("Erreur lors de la recherche:", error);
  } finally {
    isSearching.value = false;
  }
};

const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === "Enter") {
    handleSearch();
  }
};

// Rechercher par tag
const searchByTag = (tagName: string) => {
  router.push({
    name: "blog-search-results",
    query: { q: tagName },
  });
};

// Toggle affichage des tags
const toggleShowTags = () => {
  showTags.value = !showTags.value;
};
</script>

<template>
  <div class="search-container">
    <div class="search-header">
      <h2>Rechercher</h2>
      <p class="search-subtitle">Trouvez des posts par contenu ou tag</p>
    </div>

    <div class="search-form">
      <div class="search-input-group">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher dans les posts..."
          class="search-input"
          @keypress="handleKeyPress"
          :disabled="isSearching"
        />
        <BaseButton
          variant="secondary"
          size="small"
          @click="handleSearch"
          :loading="isSearching"
          :disabled="!searchQuery.trim() || isSearching"
          class="search-button"
        >
          <span v-if="!isSearching"> <i class="fas fa-search" /></span>
          Rechercher
        </BaseButton>
      </div>

      <!-- Bouton pour afficher les tags -->
      <button type="button" class="toggle-tags-button" @click="toggleShowTags">
        {{ showTags ? "Masquer les tags" : "Rechercher par tag" }}
        <span class="toggle-icon">{{ showTags ? "▲" : "▼" }}</span>
      </button>

      <!-- Liste des tags cliquables -->
      <div v-if="showTags" class="tags-dropdown">
        <div v-if="loadingTags" class="tags-loading">Chargement...</div>
        <div v-else class="tags-list">
          <span
            v-for="tag in availableTags"
            :key="tag"
            class="search-tag"
            @click="searchByTag(tag)"
          >
            #{{ tag }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
