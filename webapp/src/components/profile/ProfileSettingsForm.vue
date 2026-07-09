<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "../../stores/authStore";
import { updateUserProfile } from "../../services/users";
import { resizeImageFile } from "../../lib/utils/imageResize";
import BaseButton from "../ui/BaseButton.vue";

const authStore = useAuthStore();
const user = computed(() => authStore.user);

const settingsForm = ref({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
});

const photoFile = ref<File | null>(null);
const photoPreview = ref<string | null>(null);
const isSaving = ref(false);
const error = ref<string | null>(null);
const success = ref(false);

const avatarSrc = computed(
  () => photoPreview.value || user.value?.profilePicture || null,
);

const resetForm = () => {
  settingsForm.value = {
    firstName: user.value?.firstName || "",
    lastName: user.value?.lastName || "",
    email: user.value?.email || "",
    phone: user.value?.phone || "",
  };
  photoFile.value = null;
  photoPreview.value = null;
};

const handlePhotoChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  photoFile.value = await resizeImageFile(file);
  photoPreview.value = URL.createObjectURL(photoFile.value);
};

const save = async () => {
  isSaving.value = true;
  error.value = null;
  success.value = false;

  try {
    if (photoFile.value) {
      const { error: avatarUploadError } = await authStore.updateAvatar(
        photoFile.value,
      );
      if (avatarUploadError) throw new Error(avatarUploadError);
    }

    const updatedUser = await updateUserProfile({
      firstName: settingsForm.value.firstName,
      lastName: settingsForm.value.lastName,
      email: settingsForm.value.email,
    });
    authStore.user = updatedUser;

    success.value = true;
    photoFile.value = null;
    photoPreview.value = null;
  } catch (err) {
    console.error("Erreur lors de la mise à jour du profil:", err);
    error.value = "Erreur lors de la mise à jour du profil";
  } finally {
    isSaving.value = false;
  }
};

onMounted(resetForm);
</script>

<template>
  <div class="settings-card">
    <div class="settings-photo">
      <div class="settings-avatar">
        <img v-if="avatarSrc" :src="avatarSrc" alt="Photo de profil" />
        <span v-else class="avatar-initials">
          {{ user?.firstName?.charAt(0) }}{{ user?.lastName?.charAt(0) }}
        </span>
      </div>
      <label class="btn-outline photo-upload-btn">
        Changer la photo
        <input
          type="file"
          accept="image/*"
          class="photo-input"
          @change="handlePhotoChange"
        />
      </label>
    </div>

    <form class="settings-form" @submit.prevent="save">
      <div class="form-row">
        <div class="form-group">
          <label for="firstName">Prénom</label>
          <input
            id="firstName"
            v-model="settingsForm.firstName"
            type="text"
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label for="lastName">Nom</label>
          <input
            id="lastName"
            v-model="settingsForm.lastName"
            type="text"
            class="form-input"
          />
        </div>
      </div>

      <div class="form-group">
        <label for="email">Email</label>
        <input
          id="email"
          v-model="settingsForm.email"
          type="email"
          class="form-input"
        />
      </div>

      <div class="form-group">
        <label for="phone">Téléphone</label>
        <input
          id="phone"
          v-model="settingsForm.phone"
          type="tel"
          class="form-input"
        />
      </div>

      <p v-if="error" class="settings-message error-text">{{ error }}</p>
      <p v-if="success" class="settings-message success-text">
        Profil mis à jour avec succès.
      </p>

      <div class="edit-actions">
        <BaseButton
          variant="ghost"
          type="button"
          @click="resetForm"
          :disabled="isSaving"
        >
          Annuler
        </BaseButton>
        <BaseButton variant="primary" type="submit" :loading="isSaving">
          Enregistrer
        </BaseButton>
      </div>
    </form>
  </div>
</template>

<style scoped>
.settings-card {
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.settings-photo {
  display: flex;
  align-items: center;
  gap: 20px;
}

.settings-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--color-accent3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-white);
  overflow: hidden;
  flex-shrink: 0;
}

.settings-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-upload-btn {
  position: relative;
  padding: 10px 24px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}

.photo-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  color: var(--color-white-light);
  font-size: 0.85rem;
  font-weight: 600;
}

.form-input {
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border-secondary);
  border-radius: 8px;
  color: var(--color-white);
  font-size: 0.95rem;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-accent3-hover);
}

.settings-message {
  margin: 0;
  font-size: 0.85rem;
}

.error-text {
  color: #f88;
}

.success-text {
  color: var(--color-success);
}

.edit-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-outline {
  background: transparent;
  border: 2px solid var(--color-accent3);
  color: var(--color-accent3-hover);
  padding: 12px 32px;
  border-radius: 50px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-outline:hover {
  background: var(--color-accent3);
  color: var(--color-white);
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .settings-card {
    padding: 24px;
  }
}
</style>
