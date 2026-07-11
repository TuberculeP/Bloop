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
                >
                  Deactivate
                </BaseButton>
                <BaseButton
                  v-else
                  variant="success"
                  size="small"
                  @click="activateUser(user.id)"
                >
                  Activate
                </BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination" v-if="usersPagination.pages > 1">
        <button
          @click="goToPage(usersPagination.page - 1)"
          :disabled="usersPagination.page <= 1"
          class="pagination-btn"
        >
          Previous
        </button>
        <span class="pagination-info">
          Page {{ usersPagination.page }} of {{ usersPagination.pages }}
        </span>
        <button
          @click="goToPage(usersPagination.page + 1)"
          :disabled="usersPagination.page >= usersPagination.pages"
          class="pagination-btn"
        >
          Next
        </button>
      </div>
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
        <BaseButton variant="outline" @click="cancelDeactivate"
          >Cancel</BaseButton
        >
        <BaseButton variant="danger" @click="confirmDeactivate">
          Deactivate
        </BaseButton>
      </template>
    </BaseModal>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import AdminLayout from "../../layouts/AdminLayout.vue";
import { useAdminStore } from "../../stores/adminStore";
import { useToast } from "../../composables/useToast";
import BaseInput from "../../components/ui/BaseInput.vue";
import BaseSelect from "../../components/ui/BaseSelect.vue";
import BaseBadge from "../../components/ui/BaseBadge.vue";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseSpinner from "../../components/ui/BaseSpinner.vue";
import BaseModal from "../../components/ui/BaseModal.vue";

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

let searchTimeout: ReturnType<typeof setTimeout>;
function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    adminStore.fetchUsers(1, searchQuery.value || undefined);
  }, 300);
}

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
    font-weight: 600;
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

.pagination {
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

  &:hover:not(:disabled) {
    background: rgba(122, 15, 62, 0.4);
    border-color: var(--color-accent2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.pagination-info {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}
</style>
