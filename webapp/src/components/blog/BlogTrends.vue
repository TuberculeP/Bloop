<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { getPopularTags, type PopularTag } from "../../services/tags";
import { defaultTags } from "../../services/tags";

const emit = defineEmits<{
  tagSelected: [tag: string];
  tagDeselected: [tag: string];
}>();

const popularTags = ref<PopularTag[]>([]);
const selectedTags = ref<string[]>([]);
const loading = ref(true);

// Charger les tags populaires
onMounted(async () => {
  try {
    loading.value = true;
    const tags = await getPopularTags();
    popularTags.value = tags;
  } catch (error) {
    console.error("Erreur lors du chargement des tags populaires:", error);
  } finally {
    loading.value = false;
  }
});

// Tags à afficher : populaires s'il y en a, sinon les tags par défaut
const displayTags = computed(() => {
  if (popularTags.value.length > 0) {
    return popularTags.value.map((t) => ({
      name: t.name,
      count: parseInt(t.postCount) || 0,
    }));
  }
  // Fallback sur les tags par défaut (sans compteur)
  return defaultTags.slice(0, 10).map((name) => ({ name, count: 0 }));
});

// Vérifier si un tag est sélectionné
const isSelected = (tagName: string) => selectedTags.value.includes(tagName);

// Sélectionner/désélectionner un tag
const toggleTag = (tagName: string) => {
  if (isSelected(tagName)) {
    selectedTags.value = selectedTags.value.filter((t) => t !== tagName);
    emit("tagDeselected", tagName);
  } else {
    selectedTags.value.push(tagName);
    emit("tagSelected", tagName);
  }
};

// Réinitialiser les filtres
const clearFilters = () => {
  selectedTags.value = [];
};

// Exposer la méthode pour le parent
defineExpose({ clearFilters, selectedTags });
</script>
<template>
  <div class="trends-container">
    <div class="trends-header">
      <h2>Tendances</h2>
      <button
        v-if="selectedTags.length > 0"
        class="clear-filters"
        @click="clearFilters"
      >
        Réinitialiser
      </button>
    </div>

    <div v-if="loading" class="trends-loading">Chargement...</div>

    <div v-else class="trends-tags">
      <div
        v-for="tag in displayTags"
        :key="tag.name"
        class="trends-tag"
        :class="{ selected: isSelected(tag.name) }"
        @click="toggleTag(tag.name)"
      >
        <span class="tag-name">#{{ tag.name }}</span>
        <span v-if="tag.count > 0" class="tag-count">{{ tag.count }}</span>
      </div>
    </div>

    <div v-if="selectedTags.length > 0" class="selected-info">
      {{ selectedTags.length }} tag{{
        selectedTags.length > 1 ? "s" : ""
      }}
      sélectionné{{ selectedTags.length > 1 ? "s" : "" }}
    </div>
  </div>
</template>
<style scoped>
.trends-container {
  background: hsla(325, 30%, 8%, 0.55);
  backdrop-filter: blur(1px);
  border: 1px solid var(--color-border-secondary);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  color: var(--color-white);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trends-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.trends-header h2 {
  margin: 0;
}

.clear-filters {
  background: transparent;
  border: 1px solid var(--color-secondary);
  color: var(--color-secondary);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.8em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-filters:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.trends-loading {
  color: var(--color-secondary);
  font-style: italic;
}

.trends-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.trends-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  background: color-mix(in srgb, var(--color-accent2) 20%, transparent);
  border: 1px solid var(--color-accent3);
  color: var(--color-white);
  padding: 8px 14px;
  border-radius: 99px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.trends-tag:hover {
  box-shadow: 0 4px 16px
    color-mix(in srgb, var(--color-secondary) 20%, transparent);
  transform: translateY(-2px);
  background: color-mix(in srgb, var(--color-accent2) 30%, transparent);
  border-color: var(--color-accent);
}

.trends-tag.selected {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-black);
}

.trends-tag.selected:hover {
  background: var(--color-accent);
  transform: translateY(-2px);
}

.tag-name {
  font-weight: 500;
}

.tag-count {
  background: rgba(0, 0, 0, 0.2);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.8em;
}

.trends-tag.selected .tag-count {
  background: rgba(0, 0, 0, 0.3);
}

.selected-info {
  color: var(--color-accent);
  font-size: 0.85em;
  font-style: italic;
}
</style>
