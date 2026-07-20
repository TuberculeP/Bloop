<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/authStore";
import { formatFullDate } from "../../lib/utils/dateFormatter";
import BaseButton from "../ui/BaseButton.vue";
import BaseModal from "../ui/BaseModal.vue";
import { useToast } from "../../composables/useToast";
import {
  createPost,
  deletePost,
  getPostById,
  likePost,
  updatePost,
} from "../../services/posts";
import type { CreatePostData, Post } from "../../lib/utils/types";
import ProjectLinkRenderer from "./ProjectLinkRenderer.vue";

const props = defineProps<{
  post: Post;
  showExpanded?: boolean; // Pour afficher en mode étendu sur la page de détail
}>();

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

// État pour gérer l'affichage des commentaires
const showComments = ref(false);
const comments = ref<Post[]>([]);

const loadingComments = ref(false);
const errorComments = ref<string | null>(null);

// État pour le formulaire de commentaire
const showCommentForm = ref(false);
const commentText = ref("");
const isSubmittingComment = ref(false);
const commentError = ref<string | null>(null);

// État pour le système de like
const isLiked = ref(props.post.isLikedByMe || false);
const likeCount = ref<number>(props.post.likesCount || 0);
const isLiking = ref(false);

// État pour le menu auteur
const showAuthorMenu = ref(false);

// Vérifier si l'utilisateur est admin
const isAdmin = computed(() => {
  return authStore.user?.role === "admin";
});

// Vérifier si c'est le propre post de l'utilisateur
const isOwnPost = computed(() => {
  return authStore.user?.id === props.post.author?.id;
});

// Compter le nombre de commentaires (pour l'affichage)
const commentsCount = computed(() => {
  return comments.value.length;
});

const form = ref({
  body: "",
  tags: "",
  is_highlight: false,
  highlight_on_tag: false,
  pinned_by_user: false,
  comment_of_post_id: props.post.id ? String(props.post.id) : null, // Associer le commentaire au post
});

const fetchComments = async () => {
  loadingComments.value = true;
  errorComments.value = null;

  try {
    if (!props.post.id) {
      errorComments.value = "ID du post manquant";
      return;
    }
    const result = await getPostById(String(props.post.id));
    comments.value = Array.isArray(result.comments) ? result.comments : [];
  } catch (err) {
    console.error(err);
    errorComments.value = "Erreur lors du chargement des commentaires";
  } finally {
    loadingComments.value = false;
  }
};

// Fonction pour basculer l'affichage des commentaires
const toggleComments = async () => {
  showComments.value = !showComments.value;

  if (showComments.value && comments.value.length === 0) {
    await fetchComments();
  }
};

// Fonction pour basculer l'affichage du formulaire de commentaire
const toggleCommentForm = () => {
  showCommentForm.value = !showCommentForm.value;
  if (!showCommentForm.value) {
    commentText.value = "";
    commentError.value = null;
  }
};

// Fonction pour soumettre un commentaire

const handleSubmit = async () => {
  if (!form.value.body.trim()) {
    errorComments.value = "Le contenu sont requis";
    return;
  }

  try {
    loadingComments.value = true;
    errorComments.value = null;

    const commentData: CreatePostData = {
      body: form.value.body.trim(),
      tags: form.value.tags
        ? form.value.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag)
        : [],
      is_highlight: form.value.is_highlight,
      comment_of_post_id: form.value.comment_of_post_id,
    };

    await createPost(commentData);

    // Réinitialiser le formulaire
    form.value = {
      body: "",
      tags: "",
      is_highlight: false,
      highlight_on_tag: false,
      pinned_by_user: false,
      comment_of_post_id: props.post.id ? String(props.post.id) : null, // Associer le commentaire au post
    };

    toggleCommentForm();

    fetchComments(); // xRecharger les commentaires après la création
  } catch (err) {
    errorComments.value = "Erreur lors de la création du post";
    console.error("Erreur:", err);
  }
};

// Fonction pour gérer les likes
const toggleLike = async () => {
  if (!authStore.isAuthenticated) return;
  if (isLiking.value) return;
  if (!props.post.id) return;

  try {
    if (isLiked.value) {
      console.log("Retirer le like");

      isLiked.value = false;
      likeCount.value -= 1;
    } else {
      console.log("Ajouter le like");

      isLiked.value = true;
      likeCount.value += 1;
    }
    /* 
    // Animation immédiate pour une meilleure UX
    isLiked.value = !isLiked.value;
    likeCount.value += isLiked.value ? 1 : -1; */

    await likePost(String(props.post.id));

    // Pour l'instant, simulation
    await new Promise((resolve) => setTimeout(resolve, 300));
  } catch (error) {
    // Revenir à l'état précédent en cas d'erreur
    isLiked.value = !isLiked.value;
    likeCount.value += isLiked.value ? 1 : -1;
    console.error("Erreur lors du like:", error);
  } finally {
    isLiking.value = false;
  }
};

const showDeleteConfirm = ref(false);

const handleDelete = () => {
  if (props.post.id) showDeleteConfirm.value = true;
};

const cancelDelete = () => {
  showDeleteConfirm.value = false;
};

const confirmDelete = async () => {
  if (!props.post.id) return;

  try {
    await deletePost(props.post.id);
    showDeleteConfirm.value = false;
    toggleCommentForm();
  } catch (error) {
    console.error("Erreur lors de la suppression:", error);
    toast.error("Erreur lors de la suppression du post.");
  }
};

const toggleHighlight = async () => {
  if (props.post.id) {
    try {
      await updatePost(String(props.post.id), {
        is_highlight: !props.post.is_highlight,
      });
      toggleCommentForm();
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      toast.error("Erreur lors de la mise à jour du post.");
    }
  }
};

// Navigation vers la page de détail
const goToPostDetail = () => {
  if (props.post.id) {
    router.push(`/blog/post/${props.post.id}`);
  }
};

// Rechercher par tag
const searchByTag = (tag: string) => {
  router.push({ path: "/blog/search", query: { q: tag } });
};

// Toggle du menu auteur
const toggleAuthorMenu = () => {
  if (!isOwnPost.value) {
    showAuthorMenu.value = !showAuthorMenu.value;
  }
};

// Fermer le menu auteur
const closeAuthorMenu = () => {
  showAuthorMenu.value = false;
};

// Envoyer un message à l'auteur
const sendMessageToAuthor = () => {
  if (props.post.author?.id) {
    // Stocker les infos de l'utilisateur dans sessionStorage pour la page messages
    sessionStorage.setItem(
      "messageRecipient",
      JSON.stringify({
        id: props.post.author.id,
        firstName: props.post.author.firstName,
        lastName: props.post.author.lastName,
        email: props.post.author.email,
      }),
    );
    router.push("/messages");
  }
  closeAuthorMenu();
};

fetchComments();
</script>
<template>
  <div
    class="post-container"
    :class="{
      highlighted: post.is_highlight,
    }"
    @click="goToPostDetail"
  >
    <div class="post-header">
      <div class="author-wrapper" @click.stop>
        <div
          class="author"
          :class="{ clickable: !isOwnPost }"
          @click="toggleAuthorMenu"
        >
          {{
            props.post.author
              ? `${props.post.author.firstName} ${props.post.author.lastName}` ||
                props.post.author.email
              : "Auteur inconnu"
          }}
        </div>
        <!-- Menu contextuel auteur -->
        <div v-if="showAuthorMenu && !isOwnPost" class="author-menu">
          <button class="author-menu-item" @click="sendMessageToAuthor">
            <i class="fas fa-envelope"></i>
            Envoyer un message
          </button>
          <button class="author-menu-item" @click="closeAuthorMenu">
            <i class="fas fa-times"></i>
            Fermer
          </button>
        </div>
      </div>
      <!-- Bouton Like avec icône de cœur -->
      <button
        class="like-button"
        @click.stop="toggleLike"
        :disabled="!authStore.isAuthenticated || isLiking"
        :title="
          !authStore.isAuthenticated
            ? 'Connectez-vous pour liker'
            : isLiked
              ? 'Retirer le like'
              : 'Liker ce post'
        "
      >
        <span class="like-count" v-if="likeCount > 0">{{ likeCount }}</span>
        <div class="heart-icon" :class="{ liked: isLiked, liking: isLiking }">
          <i class="fas fa-heart"></i>
        </div>
      </button>

      <div v-if="isAdmin" class="admin-controls" @click.stop>
        <button
          @click="toggleHighlight"
          class="highlight-button"
          :class="{ active: post.is_highlight }"
          :title="
            post.is_highlight ? 'Retirer le highlight' : 'Mettre en highlight'
          "
        >
          ★
        </button>
        <button @click="handleDelete" class="delete-button" title="Supprimer">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    </div>
    <div class="post-content">
      <ProjectLinkRenderer
        :text="post.body"
        :author-first-name="post.author?.firstName"
        :author-last-name="post.author?.lastName"
        :date="post.createdAt"
      />
    </div>

    <!-- Affichage des tags du post -->
    <div v-if="post.tags && post.tags.length > 0" class="post-tags">
      <span
        v-for="tag in post.tags"
        :key="typeof tag === 'string' ? tag : tag.id"
        class="post-tag"
        @click.stop="searchByTag(typeof tag === 'string' ? tag : tag.name)"
      >
        #{{ typeof tag === "string" ? tag : tag.name }}
      </span>
    </div>

    <div class="post-footer" @click.stop>
      <div>
        <BaseButton
          variant="lightlink"
          size="small"
          @click="toggleComments"
          :loading="loadingComments"
          :title="
            showComments
              ? 'Masquer les commentaires'
              : 'Afficher les commentaires'
          "
        >
          {{ showComments ? "Masquer" : "Voir" }} commentaires ({{
            commentsCount
          }})
        </BaseButton>

        <!-- Bouton pour ajouter un commentaire (uniquement si connecté) -->
        <BaseButton
          v-if="authStore.isAuthenticated"
          variant="lightghost"
          size="small"
          @click="toggleCommentForm"
          :title="showCommentForm ? 'Annuler' : 'Ajouter un commentaire'"
          color="primary"
        >
          {{ showCommentForm ? "Réduire" : "Commenter" }}
        </BaseButton>
      </div>
      <div class="date">{{ formatFullDate(props.post.createdAt) }}</div>
    </div>

    <!-- Section des commentaires -->
    <div
      v-if="showComments || showCommentForm"
      class="comments-section"
      @click.stop
    >
      <!-- Formulaire d'ajout de commentaire -->
      <form
        @submit.prevent="handleSubmit"
        v-if="showCommentForm && authStore.isAuthenticated"
        class="comment-form"
      >
        <!-- <div class="comment-form-header">
          <h2>Ajouter un commentaire</h2>
        </div> -->
        <div class="comment-form-content">
          <textarea
            v-model="form.body"
            id="body"
            placeholder="Écrivez votre commentaire..."
            class="comment-input"
            rows="3"
            :disabled="isSubmittingComment"
            @keydown.enter.exact.prevent="handleSubmit"
          ></textarea>

          <div v-if="commentError" class="comment-form-error">
            {{ commentError }}
          </div>

          <div class="comment-form-actions">
            <BaseButton
              variant="lightghost"
              size="small"
              @click="toggleCommentForm"
              :disabled="isSubmittingComment"
            >
              Annuler
            </BaseButton>
            <BaseButton
              type="submit"
              variant="secondary"
              size="small"
              :disabled="loadingComments"
              :loading="loadingComments"
            >
              Poster
            </BaseButton>
          </div>
        </div>
      </form>

      <!-- Liste des commentaires existants -->
      <div v-if="showComments">
        <div v-if="loadingComments" class="comments-loading">
          Chargement des commentaires...
        </div>

        <div v-else-if="errorComments" class="comments-error">
          {{ errorComments }}
          <BaseButton
            variant="ghost"
            size="small"
            @click="fetchComments"
            class="retry-button"
          >
            Réessayer
          </BaseButton>
        </div>

        <div v-else-if="comments.length === 0" class="comments-empty">
          Aucun commentaire pour ce post.
        </div>

        <div v-else class="comments-list">
          <div v-for="comment in comments" class="comment-item">
            <div class="comment-header">
              <div class="comment-author">
                {{
                  comment.author
                    ? `${comment.author.firstName} ${comment.author.lastName}` ||
                      comment.author.email
                    : "Auteur inconnu"
                }}
              </div>
              <div class="comment-date">
                {{ formatFullDate(comment.createdAt) }}
              </div>
            </div>
            <div class="comment-content">
              {{ comment.body }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <BaseModal
      :model-value="showDeleteConfirm"
      @update:model-value="cancelDelete"
    >
      <template #header>
        <h3>Supprimer le post ?</h3>
      </template>
      <p>Cette action est irréversible.</p>
      <template #footer>
        <BaseButton variant="secondary" @click.stop="cancelDelete">
          Annuler
        </BaseButton>
        <BaseButton variant="danger" @click.stop="confirmDelete">
          Supprimer
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
