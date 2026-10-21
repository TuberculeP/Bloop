<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { vOnClickOutside } from "@vueuse/components";
import { useDropdown } from "../../composables/useDropdown";
import type { SelectOption } from "./BaseSelect.vue";

const props = withDefaults(
  defineProps<{
    options: SelectOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    disabled?: boolean;
  }>(),
  {
    placeholder: "Choisir...",
    searchPlaceholder: "Rechercher...",
    emptyText: "Aucun résultat",
    disabled: false,
  },
);

const model = defineModel<string>();

const { isOpen, open, close } = useDropdown();
const query = ref("");
const highlightedIndex = ref(0);
const searchInput = ref<HTMLInputElement | null>(null);
const listEl = ref<HTMLUListElement | null>(null);

// Insensible à la casse, aux accents et aux séparateurs (_ / -)
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .trim();

const selectedLabel = computed(
  () => props.options.find((o) => o.value === model.value)?.label ?? "",
);

const filteredOptions = computed(() => {
  const terms = normalize(query.value).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return props.options;
  return props.options.filter((o) => {
    const label = normalize(o.label);
    return terms.every((t) => label.includes(t));
  });
});

watch(filteredOptions, () => {
  highlightedIndex.value = 0;
});

const scrollHighlightedIntoView = () => {
  nextTick(() => {
    const el = listEl.value?.children[highlightedIndex.value] as
      HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  });
};

const openPanel = () => {
  if (props.disabled) return;
  query.value = "";
  open();
  const selected = props.options.findIndex((o) => o.value === model.value);
  highlightedIndex.value = Math.max(selected, 0);
  nextTick(() => {
    searchInput.value?.focus();
    scrollHighlightedIntoView();
  });
};

const togglePanel = () => {
  if (isOpen.value) close();
  else openPanel();
};

const selectOption = (option: SelectOption) => {
  model.value = option.value;
  close();
};

const moveHighlight = (delta: number) => {
  const count = filteredOptions.value.length;
  if (count === 0) return;
  highlightedIndex.value = (highlightedIndex.value + delta + count) % count;
  scrollHighlightedIntoView();
};

const handleKeydown = (e: KeyboardEvent) => {
  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      moveHighlight(1);
      break;
    case "ArrowUp":
      e.preventDefault();
      moveHighlight(-1);
      break;
    case "Enter": {
      e.preventDefault();
      const option = filteredOptions.value[highlightedIndex.value];
      if (option) selectOption(option);
      break;
    }
    case "Escape":
      e.preventDefault();
      e.stopPropagation();
      close();
      break;
  }
};
</script>

<template>
  <div v-on-click-outside="close" class="searchable-select">
    <button
      type="button"
      class="searchable-select-trigger"
      :class="{ open: isOpen }"
      :disabled="disabled"
      @click="togglePanel"
    >
      <span class="trigger-label" :class="{ placeholder: !selectedLabel }">
        {{ selectedLabel || placeholder }}
      </span>
      <i class="fas fa-chevron-down trigger-icon" />
    </button>

    <div v-if="isOpen" class="searchable-select-panel">
      <div class="search-row">
        <i class="fas fa-search search-icon" />
        <input
          ref="searchInput"
          v-model="query"
          type="text"
          class="search-input"
          :placeholder="searchPlaceholder"
          @keydown="handleKeydown"
        />
      </div>
      <ul v-if="filteredOptions.length > 0" ref="listEl" class="options-list">
        <li
          v-for="(option, index) in filteredOptions"
          :key="option.value"
          class="option"
          :class="{
            highlighted: index === highlightedIndex,
            selected: option.value === model,
          }"
          @mousedown.prevent="selectOption(option)"
          @mousemove="highlightedIndex = index"
        >
          <span class="option-label">{{ option.label }}</span>
          <i v-if="option.value === model" class="fas fa-check option-check" />
        </li>
      </ul>
      <p v-else class="empty-text">{{ emptyText }}</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.searchable-select {
  position: relative;
  width: 100%;
}

.searchable-select-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--color-border-secondary);
  border-radius: 6px;
  background: var(--color-bg-primary-dark);
  color: var(--color-white);
  font-size: 13px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:focus-visible,
  &.open {
    outline: none;
    border-color: var(--color-accent2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.trigger-label {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-transform: capitalize;

  &.placeholder {
    color: rgba(255, 255, 255, 0.5);
    text-transform: none;
  }
}

.trigger-icon {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  transition: transform 0.15s ease;

  .open & {
    transform: rotate(180deg);
  }
}

.searchable-select-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 10;
  background: var(--color-bg-daw-dropdown);
  border: 1px solid var(--color-border-secondary);
  border-radius: 6px;
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--color-border-secondary);
}

.search-icon {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--color-white);
  font-size: 13px;
  font-family: inherit;

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
}

.options-list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  max-height: 260px;
  overflow-y: auto;
}

.option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 12px;
  font-size: 13px;
  color: var(--color-white);
  cursor: pointer;

  &.highlighted {
    background: var(--color-bg-daw-active);
  }

  &.selected {
    color: var(--color-accent2);
  }
}

.option-label {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-transform: capitalize;
}

.option-check {
  font-size: 11px;
}

.empty-text {
  margin: 0;
  padding: 12px;
  font-size: 13px;
  font-style: italic;
  color: rgba(255, 255, 255, 0.6);
}
</style>
