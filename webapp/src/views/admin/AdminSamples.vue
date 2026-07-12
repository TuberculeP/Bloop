<template>
  <AdminLayout>
    <div class="admin-samples">
      <div class="page-header">
        <h1>Sample Library</h1>
        <BaseButton variant="accent2" @click="showImportModal = true">
          + Import Pack (ZIP)
        </BaseButton>
      </div>

      <div v-if="packsLoading" class="loading">
        <BaseSpinner />
      </div>

      <EmptyState v-else-if="packs.length === 0" title="No sample packs yet">
        <template #action>
          <BaseButton variant="accent2" @click="showImportModal = true">
            Import your first pack
          </BaseButton>
        </template>
      </EmptyState>

      <div v-else class="packs-grid">
        <div
          v-for="pack in packs"
          :key="pack.id"
          class="pack-card"
          @click="openPack(pack.id)"
        >
          <div class="pack-cover">
            <img
              v-if="pack.cover"
              :src="`/samples/packs/${pack.slug}/${pack.cover}`"
              :alt="pack.name"
            />
            <div v-else class="pack-cover-placeholder">
              {{ pack.name.charAt(0).toUpperCase() }}
            </div>
          </div>
          <div class="pack-info">
            <h3>{{ pack.name }}</h3>
            <span v-if="pack.author" class="pack-author">{{
              pack.author
            }}</span>
            <div class="pack-badges">
              <BaseBadge v-if="pack.featured" variant="featured"
                >Featured</BaseBadge
              >
              <BaseBadge v-if="!pack.isActive" variant="inactive"
                >Inactive</BaseBadge
              >
            </div>
          </div>
          <div class="pack-actions" @click.stop>
            <BaseButton variant="outline" size="small" @click="editPack(pack)"
              >Edit</BaseButton
            >
            <BaseButton
              variant="error"
              size="small"
              @click="confirmDeletePack(pack)"
            >
              Delete
            </BaseButton>
          </div>
        </div>
      </div>

      <div class="pagination" v-if="packsPagination.pages > 1">
        <button
          @click="goToPage(packsPagination.page - 1)"
          :disabled="packsPagination.page <= 1"
          class="pagination-btn"
        >
          Previous
        </button>
        <span class="pagination-info">
          Page {{ packsPagination.page }} of {{ packsPagination.pages }}
        </span>
        <button
          @click="goToPage(packsPagination.page + 1)"
          :disabled="packsPagination.page >= packsPagination.pages"
          class="pagination-btn"
        >
          Next
        </button>
      </div>
    </div>

    <!-- Import ZIP Modal -->
    <BaseModal v-model="showImportModal" size="large">
      <template #header>
        <h2>Import Sample Pack</h2>
      </template>
      <ZipPackImporter
        @cancel="showImportModal = false"
        @done="handleImportDone"
      />
    </BaseModal>

    <!-- Edit Pack Modal -->
    <BaseModal
      :model-value="editingPack !== null"
      @update:model-value="closeModal"
    >
      <template #header>
        <h2>Edit Pack</h2>
      </template>
      <form id="edit-pack-form" @submit.prevent="submitPack">
        <FormField label="Name">
          <BaseInput v-model="packForm.name" required />
        </FormField>
        <FormField label="Slug (URL-friendly)">
          <BaseInput
            v-model="packForm.slug"
            required
            pattern="[a-z0-9-]+"
            disabled
          />
        </FormField>
        <FormField label="Author">
          <BaseInput v-model="packForm.author" />
        </FormField>
        <FormField label="Cover filename">
          <BaseInput v-model="packForm.cover" placeholder="cover.jpg" />
        </FormField>
        <div class="form-group checkbox">
          <label>
            <input type="checkbox" v-model="packForm.featured" />
            Featured
          </label>
        </div>
        <div class="form-group checkbox">
          <label>
            <input type="checkbox" v-model="packForm.isActive" />
            Active
          </label>
        </div>
      </form>
      <template #footer>
        <BaseButton variant="outline" @click="closeModal">Cancel</BaseButton>
        <BaseButton variant="accent2" type="submit" form="edit-pack-form"
          >Save</BaseButton
        >
      </template>
    </BaseModal>

    <!-- Delete confirmation -->
    <BaseModal
      :model-value="pendingDeletePack !== null"
      @update:model-value="cancelDeletePack"
    >
      <template #header>
        <h2>Delete pack?</h2>
      </template>
      <p>
        Delete pack "{{ pendingDeletePack?.name }}"? This will also delete all
        folders and samples.
      </p>
      <template #footer>
        <BaseButton variant="outline" @click="cancelDeletePack"
          >Cancel</BaseButton
        >
        <BaseButton variant="error" @click="executeDeletePack">
          Delete
        </BaseButton>
      </template>
    </BaseModal>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import AdminLayout from "../../layouts/AdminLayout.vue";
import ZipPackImporter from "../../components/admin/ZipPackImporter.vue";
import { useAdminStore } from "../../stores/adminStore";
import { useToast } from "../../composables/useToast";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseModal from "../../components/ui/BaseModal.vue";
import BaseBadge from "../../components/ui/BaseBadge.vue";
import BaseSpinner from "../../components/ui/BaseSpinner.vue";
import EmptyState from "../../components/ui/EmptyState.vue";
import FormField from "../../components/ui/FormField.vue";
import BaseInput from "../../components/ui/BaseInput.vue";

const router = useRouter();
const adminStore = useAdminStore();
const toast = useToast();

const packs = computed(() => adminStore.packs);
const packsPagination = computed(() => adminStore.packsPagination);
const packsLoading = computed(() => adminStore.packsLoading);

const showImportModal = ref(false);
const editingPack = ref<any>(null);

const packForm = reactive({
  name: "",
  slug: "",
  author: "",
  cover: "",
  featured: false,
  isActive: true,
});

onMounted(() => {
  adminStore.fetchPacks();
});

function goToPage(page: number) {
  adminStore.fetchPacks(page);
}

function openPack(packId: string) {
  router.push({ name: "admin-pack-detail", params: { packId } });
}

function editPack(pack: any) {
  editingPack.value = pack;
  packForm.name = pack.name;
  packForm.slug = pack.slug;
  packForm.author = pack.author || "";
  packForm.cover = pack.cover || "";
  packForm.featured = pack.featured;
  packForm.isActive = pack.isActive;
}

function closeModal() {
  editingPack.value = null;
  packForm.name = "";
  packForm.slug = "";
  packForm.author = "";
  packForm.cover = "";
  packForm.featured = false;
  packForm.isActive = true;
}

function handleImportDone(result: any) {
  showImportModal.value = false;
  if (result?.success) {
    adminStore.fetchPacks();
  }
}

async function submitPack() {
  if (editingPack.value) {
    const result = await adminStore.updatePack(editingPack.value.id, {
      name: packForm.name,
      author: packForm.author || null,
      cover: packForm.cover || null,
      featured: packForm.featured,
      isActive: packForm.isActive,
    });
    if (result.error) {
      toast.error(`Erreur lors de la mise à jour de "${packForm.name}".`);
    } else {
      toast.success(`Pack "${packForm.name}" mis à jour.`);
    }
  }
  closeModal();
}

const pendingDeletePack = ref<any>(null);

function confirmDeletePack(pack: any) {
  pendingDeletePack.value = pack;
}

function cancelDeletePack() {
  pendingDeletePack.value = null;
}

async function executeDeletePack() {
  if (!pendingDeletePack.value) return;
  const pack = pendingDeletePack.value;
  const result = await adminStore.deletePack(pack.id);
  if (result.error) {
    toast.error(`Erreur lors de la suppression de "${pack.name}".`);
  } else {
    toast.success(`Pack "${pack.name}" supprimé.`);
  }
  pendingDeletePack.value = null;
}
</script>

<style scoped lang="scss">
.admin-samples {
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
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.packs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.pack-card {
  background: var(--color-bg-surface-deep);
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid rgba(122, 15, 62, 0.3);

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 63, 180, 0.5);
  }
}

.pack-cover {
  height: 120px;
  background: linear-gradient(
    135deg,
    var(--color-accent2) 0%,
    var(--color-accent3) 100%
  );

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.pack-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: 700;
  color: white;
}

.pack-info {
  padding: 16px;

  h3 {
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 600;
    color: var(--color-white);
  }
}

.pack-author {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.pack-badges {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.pack-actions {
  padding: 12px 16px;
  display: flex;
  gap: 8px;
  border-top: 1px solid rgba(122, 15, 62, 0.2);
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
  border-radius: 6px;
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

.form-group.checkbox {
  margin-bottom: 16px;

  label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.7);
    font-size: 13px;
  }

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
  }
}

@media (max-width: 480px) {
  .packs-grid {
    grid-template-columns: 1fr;
  }
}
</style>
