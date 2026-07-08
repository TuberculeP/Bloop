<script setup lang="ts">
export interface TabItem {
  id: string;
  label: string;
  icon: string;
}

const props = defineProps<{
  tabs: TabItem[];
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const selectTab = (id: string) => {
  if (id !== props.modelValue) emit("update:modelValue", id);
};
</script>

<template>
  <div class="tab-bar">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="tab-btn"
      :class="{ active: modelValue === tab.id }"
      @click="selectTab(tab.id)"
    >
      <i :class="tab.icon" />
      {{ tab.label }}
    </button>
  </div>
</template>

<style scoped>
.tab-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 32px;
  border-bottom: 1px solid var(--color-border-secondary);
  padding-bottom: 0;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-white-light);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: -1px;
  opacity: 0.6;

  &:hover {
    opacity: 1;
    color: var(--color-white);
  }

  &.active {
    opacity: 1;
    color: var(--color-secondary-active);
    border-bottom-color: var(--color-secondary-active);
  }
}

@media (max-width: 768px) {
  .tab-bar {
    overflow-x: auto;
  }
}
</style>
