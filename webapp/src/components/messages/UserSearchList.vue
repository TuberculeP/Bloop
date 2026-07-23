<script setup lang="ts">
import type { MessageUser } from "../../services/messages";
import ProfileAvatar from "../shared/ProfileAvatar.vue";

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
        <ProfileAvatar :user="user" size="small" />
        <span class="user-name">{{ user.firstName }} {{ user.lastName }}</span>
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
}

.user-search-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-md);
  background: var(--color-border-secondary);
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
  background: var(--color-primary-pale);
}

.user-name {
  font-weight: 500;
}

.no-users {
  text-align: center;
  padding: 1rem;
}
</style>
