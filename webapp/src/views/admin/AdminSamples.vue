<template>
  <AdminLayout>
    <div class="admin-samples">
      <div class="page-header">
        <h1>Sample Library</h1>
        <button @click="showImportModal = true" class="btn-primary">
          + Import Pack (ZIP)
        </button>
      </div>

      <div v-if="packsLoading" class="loading">Loading...</div>

      <div v-else-if="packs.length === 0" class="empty-state">
        <p>No sample packs yet</p>
        <button @click="showImportModal = true" class="btn-primary">
          Import your first pack
        </button>
      </div>

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
              <span v-if="pack.featured" class="badge featured">Featured</span>
              <span v-if="!pack.isActive" class="badge inactive">Inactive</span>
            </div>
          </div>
          <div class="pack-actions" @click.stop>
            <button @click="editPack(pack)" class="action-btn">Edit</button>
            <button @click="confirmDeletePack(pack)" class="action-btn danger">
              Delete
            </button>
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
    <div
      v-if="showImportModal"
      class="modal-overlay"
      @click="showImportModal = false"
    >
      <div class="modal modal-large" @click.stop>
        <h2>Import Sample Pack</h2>
        <ZipPackImporter
          @cancel="showImportModal = false"
          @done="handleImportDone"
        />
      </div>
    </div>

    <!-- Edit Pack Modal -->
    <div v-if="editingPack" class="modal-overlay" @click="closeModal">
      <div class="modal" @click.stop>
        <h2>Edit Pack</h2>
        <form @submit.prevent="submitPack">
          <div class="form-group">
            <label>Name</label>
            <input v-model="packForm.name" required />
          </div>
          <div class="form-group">
            <label>Slug (URL-friendly)</label>
            <input
              v-model="packForm.slug"
              required
              pattern="[a-z0-9-]+"
              disabled
            />
          </div>
          <div class="form-group">
            <label>Author</label>
            <input v-model="packForm.author" />
          </div>
          <div class="form-group">
            <label>Cover filename</label>
            <input v-model="packForm.cover" placeholder="cover.jpg" />
          </div>
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
          <div class="modal-actions">
            <button type="button" @click="closeModal" class="btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import AdminLayout from "../../layouts/AdminLayout.vue";
import ZipPackImporter from "../../components/admin/ZipPackImporter.vue";
import { useAdminStore } from "../../stores/adminStore";

const router = useRouter();
const adminStore = useAdminStore();

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
    await adminStore.updatePack(editingPack.value.id, {
      name: packForm.name,
      author: packForm.author || null,
      cover: packForm.cover || null,
      featured: packForm.featured,
      isActive: packForm.isActive,
    });
  }
  closeModal();
}

async function confirmDeletePack(pack: any) {
  if (
    confirm(
      `Delete pack "${pack.name}"? This will also delete all folders and samples.`,
    )
  ) {
    await adminStore.deletePack(pack.id);
  }
}
</script>

<style scoped lang="scss">
.admin-samples {
  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: #f2efe8;
  }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.btn-primary {
  padding: 10px 20px;
  background: #ff3fb4;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #e0359e;
  }
}

.loading,
.empty-state {
  text-align: center;
  padding: 48px;
  color: rgba(255, 255, 255, 0.6);

  p {
    margin: 0 0 16px;
  }
}

.packs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.pack-card {
  background: #2a1520;
  border-radius: 12px;
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
  background: linear-gradient(135deg, #ff3fb4 0%, #7a0f3e 100%);

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
    color: #f2efe8;
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

.badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;

  &.featured {
    background: rgba(255, 63, 180, 0.2);
    color: #ff3fb4;
  }

  &.inactive {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }
}

.pack-actions {
  padding: 12px 16px;
  display: flex;
  gap: 8px;
  border-top: 1px solid rgba(122, 15, 62, 0.2);
}

.action-btn {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 6px;
  color: #f2efe8;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  &.danger {
    color: #ef4444;

    &:hover {
      background: rgba(239, 68, 68, 0.2);
    }
  }
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
  background: #2a1520;
  border: 1px solid rgba(122, 15, 62, 0.5);
  border-radius: 6px;
  color: #f2efe8;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    background: rgba(122, 15, 62, 0.4);
    border-color: #ff3fb4;
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

// Modal styles
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #2a1520;
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 400px;
  border: 1px solid rgba(122, 15, 62, 0.5);

  &.modal-large {
    max-width: 540px;
  }

  h2 {
    margin: 0 0 20px;
    font-size: 18px;
    color: #f2efe8;
  }
}

.form-group {
  margin-bottom: 16px;

  label {
    display: block;
    margin-bottom: 6px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
  }

  input[type="text"],
  input:not([type]) {
    width: 100%;
    padding: 10px 12px;
    background: #1a0e15;
    border: 1px solid rgba(122, 15, 62, 0.5);
    border-radius: 6px;
    color: #f2efe8;
    font-size: 14px;

    &:focus {
      outline: none;
      border-color: #ff3fb4;
    }

    &:disabled {
      opacity: 0.5;
    }
  }

  &.checkbox {
    label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    input[type="checkbox"] {
      width: 16px;
      height: 16px;
    }
  }
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn-secondary {
  padding: 10px 20px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: #f2efe8;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
}
</style>
