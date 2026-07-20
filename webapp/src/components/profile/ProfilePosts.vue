<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/authStore";
import { getAllPosts, updatePost, deletePost } from "../../services/posts";
import BlogPost from "../../components/blog/BlogPost.vue";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseModal from "../../components/ui/BaseModal.vue";
import EmptyState from "../../components/ui/EmptyState.vue";
import { useToast } from "../../composables/useToast";
import type { Post } from "../../lib/utils/types";

const toast = useToast();

const emit = defineEmits<{
  (e: "posts-changed", posts: Post[]): void;
}>();

const router = useRouter();
const authStore = useAuthStore();
const user = computed(() => authStore.user);

const userPosts = ref<Post[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const editingPost = ref<Post | null>(null);
const editForm = ref({ body: "" });

const loadUserPosts = async () => {
  if (!user.value) {
    router.push("/login");
    return;
  }

  try {
    isLoading.value = true;
    error.value = null;

    const allPosts = await getAllPosts();
    userPosts.value = allPosts
      .filter(
        (post) =>
          post.author &&
          post.author.id &&
          user.value?.id &&
          post.author.id === user.value.id,
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt || "").getTime() -
          new Date(a.createdAt || "").getTime(),
      );

    emit("posts-changed", userPosts.value);
  } catch (err) {
    console.error("Erreur lors du chargement des posts:", err);
    error.value = "Erreur lors du chargement de vos posts";
  } finally {
    isLoading.value = false;
  }
};

const startEdit = (post: Post) => {
  editingPost.value = post;
  editForm.value = { body: post.body };
};

const cancelEdit = () => {
  editingPost.value = null;
  editForm.value = { body: "" };
};

const saveEdit = async () => {
  if (!editingPost.value?.id) return;

  try {
    await updatePost(editingPost.value.id.toString(), {
      body: editForm.value.body,
    });

    const index = userPosts.value.findIndex(
      (p: Post) => p.id === editingPost.value?.id,
    );
    if (index !== -1) {
      userPosts.value[index] = {
        ...userPosts.value[index],
        body: editForm.value.body,
      };
    }

    cancelEdit();
  } catch (err) {
    console.error("Erreur lors de la modification:", err);
    toast.error("Erreur lors de la modification du post.");
  }
};

const pendingDeletePostId = ref<number | null>(null);

const handleDeletePost = (postId: number) => {
  pendingDeletePostId.value = postId;
};

const cancelDeletePost = () => {
  pendingDeletePostId.value = null;
};

const confirmDeletePost = async () => {
  if (pendingDeletePostId.value === null) return;
  const postId = pendingDeletePostId.value;

  try {
    await deletePost(postId);
    userPosts.value = userPosts.value.filter((p: Post) => p.id !== postId);
    emit("posts-changed", userPosts.value);
  } catch (err) {
    console.error("Erreur lors de la suppression:", err);
    toast.error("Erreur lors de la suppression du post.");
  } finally {
    pendingDeletePostId.value = null;
  }
};

onMounted(loadUserPosts);
</script>

<template>
  <div v-if="error" class="state-container error">
    <div class="error-box">
      <p>{{ error }}</p>
      <button @click="loadUserPosts" class="btn-text-accent">
        Réessayer le chargement
      </button>
    </div>
  </div>

  <div v-else-if="isLoading" class="state-container">
    <div class="loader-grid">
      <div class="skeleton-card" v-for="n in 3" :key="n"></div>
    </div>
  </div>

  <div v-else class="profile-posts">
    <EmptyState
      v-if="userPosts.length === 0"
      icon="fas fa-newspaper"
      title="Aucun post pour le moment"
      message="Commencez à partager vos idées !"
    >
      <template #action>
        <BaseButton
          variant="outline"
          @click="router.push('/blog')"
          label="Créer mon premier post"
        />
      </template>
    </EmptyState>

    <div v-else class="posts-list">
      <div
        v-for="post in userPosts"
        :key="post.id"
        class="project-card post-item"
      >
        <div v-if="editingPost?.id === post.id" class="edit-mode">
          <textarea
            v-model="editForm.body"
            class="edit-textarea"
            placeholder="Contenu du post..."
            rows="4"
          ></textarea>
          <div class="edit-actions">
            <BaseButton
              variant="outline"
              size="small"
              @click="cancelEdit"
              label="Annuler"
            />
            <BaseButton
              color="secondary"
              size="small"
              @click="saveEdit"
              :disabled="!editForm.body.trim()"
              label="Sauvegarder"
            />
          </div>
        </div>

        <div v-else class="post-display">
          <BlogPost :post="post" />
          <div class="post-actions">
            <BaseButton
              variant="outline"
              @click="post.id !== undefined && handleDeletePost(post.id)"
              left-icon="fas fa-trash-alt"
              label="Supprimer"
            />
            <BaseButton
              @click="startEdit(post)"
              label="Modifier"
              left-icon="fas fa-pencil-alt"
            />
          </div>
        </div>
      </div>
    </div>

    <BaseModal
      :model-value="pendingDeletePostId !== null"
      @update:model-value="cancelDeletePost"
    >
      <template #header>
        <h3>Supprimer le post ?</h3>
      </template>
      <p>Cette action est irréversible.</p>
      <template #footer>
        <BaseButton
          variant="secondary"
          @click="cancelDeletePost"
          label="Annuler"
        />
        <BaseButton @click="confirmDeletePost" label="Supprimer" />
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.posts-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.project-card {
  background: var(--color-bg-secondary-dark);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.project-card:hover {
  border-color: var(--color-accent3-hover);
  box-shadow: var(--shadow-lg);
  background: linear-gradient(
    180deg,
    var(--color-bg-accent3-dark) 0%,
    var(--color-bg-secondary-dark) 100%
  );
}

.post-display {
  padding: 20px;
}

.post-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-secondary);
}

.edit-mode {
  padding: 20px;
}

.edit-textarea {
  width: 100%;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-md);
  color: var(--color-white);
  font-size: 1rem;
  line-height: 1.5;
  resize: vertical;
  margin-bottom: 16px;
  box-sizing: border-box;
}

.edit-textarea:focus {
  outline: none;
  border-color: var(--color-accent3-hover);
}

.edit-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.state-container {
  text-align: center;
  padding: 60px 20px;
}

.loader-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.skeleton-card {
  height: 140px;
  background: var(--color-bg-secondary-dark);
  border-radius: var(--radius-xl);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
  }
}

.state-container h3 {
  color: var(--color-white);
  font-size: 1.5rem;
  margin-bottom: 10px;
}

.state-container p {
  color: var(--color-white-light);
  margin-bottom: 24px;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.btn-text-accent {
  background: none;
  border: none;
  color: var(--color-error-hover);
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  margin-top: 10px;
}

.error-box {
  color: var(--color-white-light);
}

@media (max-width: 768px) {
  .post-actions {
    flex-direction: column;
  }

  .post-actions :deep(.base-button) {
    width: 100%;
    justify-content: center;
  }
}
</style>
