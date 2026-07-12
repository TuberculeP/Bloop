<template>
  <div class="register-container">
    <form class="form-container" @submit.prevent="submitForm">
      <h2>Inscription</h2>

      <FormField label="Email" html-for="email">
        <BaseInput
          id="email"
          type="email"
          v-model="form.email"
          placeholder="Entrez votre email"
          required
        />
      </FormField>

      <FormField label="Mot de passe" html-for="password">
        <BaseInput
          id="password"
          type="password"
          v-model="form.password"
          placeholder="Entrez votre mot de passe"
          required
        />
      </FormField>

      <FormField label="Prénom" html-for="firstName">
        <BaseInput
          id="firstName"
          type="text"
          v-model="form.firstName"
          placeholder="Entrez votre prénom"
          required
        />
      </FormField>

      <FormField label="Nom" html-for="lastName">
        <BaseInput
          id="lastName"
          type="text"
          v-model="form.lastName"
          placeholder="Entrez votre nom"
          required
        />
      </FormField>

      <FormField label="Photo de profil" html-for="profilePicture">
        <input
          id="profilePicture"
          type="file"
          accept="image/*"
          @change="handleFileUpload"
        />
        <div v-if="previewUrl" class="image-preview">
          <img :src="previewUrl" alt="Aperçu de votre photo de profil" />
        </div>
      </FormField>

      <BaseButton type="submit">Créer mon compte</BaseButton>

      <div class="form-footer">
        <router-link :to="{ name: 'app-login' }" class="login-link">
          Déjà inscrit ? Se connecter
        </router-link>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import apiClient from "../../lib/utils/apiClient";
import { resizeImageFile } from "../../lib/utils/imageResize";
import { useAuthStore } from "../../stores/authStore";
import { useRouter } from "vue-router";
import type { User } from "../../lib/utils/types";
import FormField from "../../components/ui/FormField.vue";
import BaseInput from "../../components/ui/BaseInput.vue";
import BaseButton from "../../components/ui/BaseButton.vue";
import { useToast } from "../../composables/useToast";

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();
const profilePictureFile = ref<File | null>(null);
const previewUrl = ref<string>("");

const form = reactive({
  email: "",
  password: "",
  firstName: "",
  lastName: "",
});

const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (file) {
    profilePictureFile.value = await resizeImageFile(file);

    // Create a preview
    const reader = new FileReader();
    reader.onload = (e) => {
      previewUrl.value = e.target?.result as string;
    };
    reader.readAsDataURL(profilePictureFile.value);
  }
};

async function submitForm() {
  try {
    const result = await apiClient.post<{ user: User }>("/auth/register", {
      email: form.email,
      password: form.password,
      firstName: form.firstName,
      lastName: form.lastName,
    });

    if (result.error || !result.data?.user) {
      console.error("Erreur lors de l'inscription:", result.error);
      toast.error("Erreur lors de l'inscription. Veuillez réessayer.");
      return;
    }

    authStore.user = result.data.user;

    if (profilePictureFile.value) {
      const { error: avatarError } = await authStore.updateAvatar(
        profilePictureFile.value,
      );
      if (avatarError) {
        console.error("Erreur lors de l'upload de l'avatar:", avatarError);
        toast.error("Erreur lors de l'upload de la photo de profil.");
      }
    }

    router.push({ name: "landing-main" });
  } catch (error) {
    console.error("Erreur lors de l'envoi du formulaire:", error);
    toast.error("Erreur lors de l'envoi du formulaire.");
  }
}
</script>

<style scoped>
.register-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 20px;
}

.form-container {
  max-width: 400px;
  width: 100%;
}

.form-container h2 {
  color: var(--color-white);
  text-align: left;
  margin-bottom: 24px;
  font-size: 1.8rem;
}

.form-footer {
  text-align: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border-secondary);
}

.login-link {
  color: var(--color-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s ease;
}

.login-link:hover {
  color: var(--color-secondary-hover);
  text-decoration: underline;
}

.image-preview {
  margin-top: 12px;
  text-align: center;
}

.image-preview img {
  max-width: 150px;
  max-height: 150px;
  border-radius: var(--radius-md);
  object-fit: cover;
  border: 2px solid var(--color-border-secondary);
}

/* Responsive */
@media (max-width: 480px) {
  .form-container {
    padding: 24px;
    margin: 16px;
  }

  .register-container {
    min-height: 70vh;
  }
}
</style>
