<template>
  <LandingLayout>
    <LandingHeader />
    <main class="contact-page">
      <div class="contact-container">
        <header class="contact-header">
          <div class="contact-ref">
            <span class="contact-ref-tick" aria-hidden="true"></span>
            <span>Contact</span>
          </div>

          <h1 class="contact-title">
            Une question ? <span class="highlight">Parlons-en.</span>
          </h1>

          <p class="contact-intro">
            Une idée, un bug, une envie de collaborer&nbsp;? Écris-nous, on
            répond en général sous 24 à 48h.
          </p>
        </header>

        <section class="contact-grid">
          <form class="contact-form" @submit.prevent="handleSubmit">
            <div class="form-row">
              <div class="form-field">
                <label for="contact-name">Nom</label>
                <input
                  id="contact-name"
                  v-model="form.name"
                  type="text"
                  placeholder="Ton nom"
                  required
                />
              </div>
              <div class="form-field">
                <label for="contact-email">Email</label>
                <input
                  id="contact-email"
                  v-model="form.email"
                  type="email"
                  placeholder="ton@email.com"
                  required
                />
              </div>
            </div>

            <div class="form-field">
              <label for="contact-subject">Sujet</label>
              <select id="contact-subject" v-model="form.subject" required>
                <option value="" disabled>Choisis un sujet</option>
                <option
                  v-for="subject in subjects"
                  :key="subject"
                  :value="subject"
                >
                  {{ subject }}
                </option>
              </select>
            </div>

            <div class="form-field">
              <label for="contact-message">Message</label>
              <textarea
                id="contact-message"
                v-model="form.message"
                rows="6"
                placeholder="Explique-nous tout..."
                required
              ></textarea>
            </div>

            <BaseButton
              type="submit"
              color="gradient"
              size="large"
              :label="submitLabel"
              :disabled="isSubmitting"
              right-icon="far fa-paper-plane"
            />

            <p v-if="submitted" class="form-success">
              Message envoyé ! On revient vers toi très vite.
            </p>
          </form>

          <aside class="contact-info">
            <div
              v-for="channel in contactChannels"
              :key="channel.title"
              class="info-card"
            >
              <div class="info-icon">
                <i :class="channel.icon"></i>
              </div>
              <div class="info-body">
                <h3>{{ channel.title }}</h3>
                <p>{{ channel.description }}</p>
                <a v-if="channel.link" :href="channel.link" class="info-link">
                  {{ channel.linkLabel }}
                </a>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
    <LandingFooter />
  </LandingLayout>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import LandingLayout from "../../layouts/LandingLayout.vue";
import LandingHeader from "../../components/landing/LandingHeader.vue";
import LandingFooter from "../../components/landing/LandingFooter.vue";
import BaseButton from "../../components/ui/BaseButton.vue";

const subjects = ["Support technique", "Partenariat", "Presse", "Autre"];

const contactChannels = [
  {
    icon: "fas fa-envelope",
    title: "Email",
    description: "Pour toute question générale sur Bloop.",
    link: "mailto:hello@bloop-on.cloud",
    linkLabel: "hello@bloop-on.cloud",
  },
  {
    icon: "fab fa-instagram",
    title: "Instagram",
    description: "Rejoins la communauté, pose tes questions.",
    link: "/",
    linkLabel: "Rejoindre le serveur",
  },
  {
    icon: "fas fa-newspaper",
    title: "Presse",
    description: "Demandes médias et partenariats.",
    link: "mailto:presse@bloop-on.cloud",
    linkLabel: "presse@bloop-on.cloud",
  },
];

const form = reactive({
  name: "",
  email: "",
  subject: "",
  message: "",
});

const isSubmitting = ref(false);
const submitted = ref(false);

const submitLabel = computed(() =>
  isSubmitting.value ? "Envoi..." : "Envoyer le message",
);

const handleSubmit = async () => {
  isSubmitting.value = true;
  submitted.value = false;

  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1000));

  isSubmitting.value = false;
  submitted.value = true;
  form.name = "";
  form.email = "";
  form.subject = "";
  form.message = "";
};
</script>

<style scoped>
.contact-page {
  color: var(--color-white);
  padding: 8rem 0 6rem;
}

.contact-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  flex-direction: column;
  gap: 4rem;
}

/* Header */
.contact-header {
  text-align: center;
}

.contact-ref {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: "Courier New", monospace;
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 1.5rem;
}

.contact-ref-tick {
  width: 10px;
  height: 1px;
  background: var(--color-accent);
}

.contact-title {
  font-size: clamp(2.25rem, 4.5vw, 3.25rem);
  font-weight: 500;
  line-height: 1.2;
  margin-bottom: 1.25rem;
}

.contact-title .highlight {
  color: var(--color-accent);
}

.contact-intro {
  font-size: 1.15rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.65);
  max-width: 600px;
  margin: 0 auto;
}

/* Contact grid */
.contact-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 3rem;
  align-items: start;
}

/* Form */
.contact-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-xl);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.form-field input,
.form-field select,
.form-field textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: var(--color-white);
  font-size: 0.95rem;
  font-family: inherit;
  transition: all 0.3s ease;
}

.form-field textarea {
  resize: vertical;
  min-height: 120px;
}

.form-field input:focus,
.form-field select:focus,
.form-field textarea:focus {
  outline: none;
  border-color: rgba(255, 210, 105, 0.5);
  background: rgba(255, 255, 255, 0.08);
}

.form-field input::placeholder,
.form-field textarea::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.form-field select option {
  background: var(--color-black);
  color: var(--color-white);
}

.form-success {
  font-size: 0.9rem;
  color: var(--color-accent);
}

/* Contact info */
.contact-info {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.info-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-xl);
  transition: all 0.3s ease;
}

.info-card:hover {
  border-color: rgba(255, 210, 105, 0.3);
  transform: translateY(-3px);
}

.info-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
  color: var(--color-accent);
  font-size: 1.1rem;
}

.info-body h3 {
  font-size: 1rem;
  color: var(--color-white);
  margin-bottom: 0.25rem;
}

.info-body p {
  font-size: 0.85rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.5rem;
}

.info-link {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-accent);
  text-decoration: none;
}

.info-link:hover {
  text-decoration: underline;
}

/* Responsive */
@media (max-width: 768px) {
  .contact-page {
    padding: 6rem 0 4rem;
  }

  .contact-container {
    padding: 0 1.5rem;
    gap: 3rem;
  }

  .contact-grid {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .contact-form {
    padding: 1.5rem;
  }
}
</style>
