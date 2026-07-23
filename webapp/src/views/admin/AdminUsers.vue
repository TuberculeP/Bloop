<template>
  <AdminLayout>
    <div class="admin-users">
      <div class="page-header">
        <h1>Users Management</h1>
        <BaseInput
          v-model="searchQuery"
          @input="debouncedSearch"
          placeholder="Search by email or name..."
          class="search-input"
        />
      </div>

      <div v-if="usersLoading" class="loading">
        <BaseSpinner />
      </div>

      <div v-else class="users-table-container">
        <table class="users-table">
          <thead>
            <tr>
              <th>Id</th>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.id }}</td>
              <td>{{ user.email }}</td>
              <td>{{ user.firstName }} {{ user.lastName }}</td>
              <td>
                <BaseSelect
                  :model-value="user.role"
                  :options="roleOptions"
                  class="role-select"
                  @update:model-value="(role) => updateRole(user.id, role)"
                />
              </td>
              <td>
                <BaseBadge :variant="user.isActive ? 'active' : 'inactive'">
                  {{ user.isActive ? "Active" : "Inactive" }}
                </BaseBadge>
              </td>
              <td>{{ formatDate(user.createdAt) }}</td>
              <td>
                <BaseButton
                  v-if="user.isActive"
                  variant="danger"
                  size="small"
                  @click="deactivateUser(user.id)"
                  label="Deactivate"
                />
                <BaseButton
                  v-else
                  variant="success"
                  size="small"
                  @click="activateUser(user.id)"
                  label="Activate"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <BasePagination
        :page="usersPagination.page"
        :pages="usersPagination.pages"
        @update:page="goToPage"
      />
    </div>

    <BaseModal
      :model-value="pendingDeactivateId !== null"
      @update:model-value="cancelDeactivate"
    >
      <template #header>
        <h2>Deactivate user?</h2>
      </template>
      <p>This user will no longer be able to log in.</p>
      <template #footer>
        <BaseButton
          variant="outline"
          @click="cancelDeactivate"
          label="Cancel"
        />
        <BaseButton
          variant="danger"
          @click="confirmDeactivate"
          label="Deactivate"
        />
      </template>
    </BaseModal>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import AdminLayout from "../../layouts/AdminLayout.vue";
import { useAdminStore } from "../../stores/adminStore";
import { useToast } from "../../composables/useToast";
import { useDebouncedCallback } from "../../composables/useDebouncedCallback";
import BaseInput from "../../components/ui/BaseInput.vue";
import BaseSelect from "../../components/ui/BaseSelect.vue";
import BaseBadge from "../../components/ui/BaseBadge.vue";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseSpinner from "../../components/ui/BaseSpinner.vue";
import BaseModal from "../../components/ui/BaseModal.vue";
import BasePagination from "../../components/ui/BasePagination.vue";

const adminStore = useAdminStore();
const toast = useToast();
const searchQuery = ref("");

const roleOptions = [
  { value: "ROLE_USER", label: "User" },
  { value: "ROLE_ADMIN", label: "Admin" },
];

const users = computed(() => adminStore.users);
const usersPagination = computed(() => adminStore.usersPagination);
const usersLoading = computed(() => adminStore.usersLoading);

onMounted(() => {
  adminStore.fetchUsers();
});

const debouncedSearch = useDebouncedCallback(() => {
  adminStore.fetchUsers(1, searchQuery.value || undefined);
});

function goToPage(page: number) {
  adminStore.fetchUsers(page, searchQuery.value || undefined);
}

async function updateRole(userId: string, role: string) {
  const result = await adminStore.updateUser(userId, { role });
  if (result.error) {
    toast.error("Erreur lors du changement de rôle.");
  }
}

const pendingDeactivateId = ref<string | null>(null);

function deactivateUser(userId: string) {
  pendingDeactivateId.value = userId;
}

function cancelDeactivate() {
  pendingDeactivateId.value = null;
}

async function confirmDeactivate() {
  if (!pendingDeactivateId.value) return;
  const result = await adminStore.updateUser(pendingDeactivateId.value, {
    isActive: false,
  });
  if (result.error) {
    toast.error("Erreur lors de la désactivation de l'utilisateur.");
  } else {
    toast.success("Utilisateur désactivé.");
  }
  pendingDeactivateId.value = null;
}

async function activateUser(userId: string) {
  const result = await adminStore.updateUser(userId, { isActive: true });
  if (result.error) {
    toast.error("Erreur lors de l'activation de l'utilisateur.");
  } else {
    toast.success("Utilisateur activé.");
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString();
}
</script>

<style scoped lang="scss">
.admin-users {
  h1 {
    margin: 0;
    font-size: 24px;
    color: var(--color-white);
  }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}

.page-header .search-input {
  width: 300px;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.users-table-container {
  overflow-x: auto;
}

.users-table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  background: var(--color-bg-surface-deep);
  border-radius: var(--radius-lg);
  overflow: hidden;

  th,
  td {
    padding: 14px 16px;
    text-align: left;
  }

  th {
    background: rgba(122, 15, 62, 0.3);
    color: rgba(255, 255, 255, 0.8);
    font-weight: 500;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  td {
    color: var(--color-white);
    border-top: 1px solid rgba(122, 15, 62, 0.2);
  }

  tbody tr:hover {
    background: rgba(122, 15, 62, 0.15);
  }
}

.role-select {
  width: auto;
}

@media (max-width: 480px) {
  .page-header .search-input {
    width: 100%;
  }
}
</style>
