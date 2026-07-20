<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/authStore";
import { useOnboardingStore } from "../../stores/onboardingStore";
import { updateUserProfile } from "../../services/users";
import { resizeImageFile } from "../../lib/utils/imageResize";
import BaseButton from "../ui/BaseButton.vue";
import FormField from "../ui/FormField.vue";
import BaseInput from "../ui/BaseInput.vue";
import { useToast } from "../../composables/useToast";

const router = useRouter();
const authStore = useAuthStore();
const onboardingStore = useOnboardingStore();
const toast = useToast();
const user = computed(() => authStore.user);

const replayOnboarding = async () => {
  await router.push({ name: "app-main" });
  onboardingStore.start();
};

const settingsForm = ref({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
});

const photoInputRef = ref<HTMLInputElement | null>(null);
const photoFile = ref<File | null>(null);
const photoPreview = ref<string | null>(null);
const isSaving = ref(false);

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

    toast.success("Profil mis à jour avec succès.");
    photoFile.value = null;
    photoPreview.value = null;
  } catch (err) {
    console.error("Erreur lors de la mise à jour du profil:", err);
    toast.error("Erreur lors de la mise à jour du profil.");
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
      <BaseButton
        type="button"
        variant="ghost"
        @click="photoInputRef?.click()"
        label="Changer la photo"
      />
      <input
        ref="photoInputRef"
        type="file"
        accept="image/*"
        class="photo-input"
        @change="handlePhotoChange"
      />
    </div>

    <form class="settings-form" @submit.prevent="save">
      <div class="form-row">
        <FormField label="Prénom" html-for="firstName">
          <BaseInput id="firstName" v-model="settingsForm.firstName" />
        </FormField>
        <FormField label="Nom" html-for="lastName">
          <BaseInput id="lastName" v-model="settingsForm.lastName" />
        </FormField>
      </div>

      <FormField label="Email" html-for="email">
        <BaseInput id="email" v-model="settingsForm.email" type="email" />
      </FormField>

      <FormField label="Téléphone" html-for="phone">
        <BaseInput id="phone" v-model="settingsForm.phone" type="tel" />
      </FormField>

      <div class="edit-actions">
        <BaseButton
          variant="ghost"
          type="button"
          @click="resetForm"
          :disabled="isSaving"
          label="Annuler"
        />
        <BaseButton
          variant="primary"
          type="submit"
          :loading="isSaving"
          label="Enregistrer"
        />
      </div>
    </form>

    <div class="tutorial-section">
      <div class="tutorial-info">
        <h3>Tutoriels</h3>
        <p>Revoyez le parcours guidé de découverte de l'application.</p>
      </div>
      <BaseButton
        variant="outline"
        type="button"
        @click="replayOnboarding"
        label="Revoir le tutoriel de bienvenue"
      />
    </div>
  </div>
</template>

<style scoped>
.settings-card {
  border-radius: var(--radius-xl);
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

.photo-input {
  display: none;
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

.edit-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.tutorial-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border-secondary);
}

.tutorial-info h3 {
  margin: 0 0 4px;
  color: var(--color-white);
  font-size: 1rem;
}

.tutorial-info p {
  margin: 0;
  color: var(--color-white-light);
  opacity: 0.7;
  font-size: 0.85rem;
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
