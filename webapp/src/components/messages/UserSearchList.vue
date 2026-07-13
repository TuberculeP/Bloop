<script setup lang="ts">
import type { MessageUser } from "../../services/messages";

defineProps<{
  users: MessageUser[];
  searchQuery: string;
}>();

defineEmits<{
  select: [user: MessageUser];
  "update:searchQuery": [value: string];
}>();
</script>

<template>
  <div class="user-search">
    <input
      :value="searchQuery"
      @input="
        $emit('update:searchQuery', ($event.target as HTMLInputElement).value)
      "
      type="text"
      placeholder="Rechercher un utilisateur..."
      class="user-search-input"
    />
    <div class="users-list">
      <div
        v-for="user in users"
        :key="user.id"
        class="user-item"
        @click="$emit('select', user)"
      >
        <div class="user-avatar">
          {{ user.firstName[0] }}{{ user.lastName[0] }}
        </div>
        <div class="user-info">
          <span class="user-name"
            >{{ user.firstName }} {{ user.lastName }}</span
          >
          <span class="user-email">{{ user.email }}</span>
        </div>
      </div>
      <div v-if="users.length === 0" class="no-users">
        Aucun utilisateur trouvé
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-search {
  padding: 1rem;
  border-bottom: 1px solid var(--color-border-secondary);
  background: var(--bg-tertiary);
}

.user-search-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  margin-bottom: 0.5rem;
}

.users-list {
  max-height: 200px;
  overflow-y: auto;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.2s;
}

.user-item:hover {
  background: var(--bg-primary);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--accent-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 500;
}

.user-email {
  font-size: 0.75rem;
}

.no-users {
  text-align: center;
  padding: 1rem;
}
</style>
