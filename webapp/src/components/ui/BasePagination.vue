<script setup lang="ts">
defineProps<{
  page: number;
  pages: number;
}>();

const emit = defineEmits<{
  "update:page": [page: number];
}>();
</script>

<template>
  <div class="base-pagination" v-if="pages > 1">
    <button
      @click="emit('update:page', page - 1)"
      :disabled="page <= 1"
      class="pagination-btn"
    >
      Previous
    </button>
    <span class="pagination-info">Page {{ page }} of {{ pages }}</span>
    <button
      @click="emit('update:page', page + 1)"
      :disabled="page >= pages"
      class="pagination-btn"
    >
      Next
    </button>
  </div>
</template>

<style scoped>
.base-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
}

.pagination-btn {
  padding: 8px 16px;
  background: var(--color-bg-surface-deep);
  border: 1px solid rgba(122, 15, 62, 0.5);
  border-radius: var(--radius-md);
  color: var(--color-white);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.pagination-btn:hover:not(:disabled) {
  background: rgba(122, 15, 62, 0.4);
  border-color: var(--color-accent2);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}
</style>
