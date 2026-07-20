<template>
  <LandingLayout>
    <LandingHeader />
    <main class="about-page">
      <div class="about-container">
        <header class="about-header">
          <div class="about-ref">
            <span class="about-ref-tick" aria-hidden="true"></span>
            <span>À propos</span>
          </div>

          <h1 class="about-title">
            La musique, <span class="highlight">sans les galères.</span>
          </h1>

          <p class="about-intro">
            Bloop est né d'une idée simple&nbsp;: tout le monde devrait pouvoir
            composer, sans logiciel compliqué à installer, sans payer pour des
            sons, et sans être musicien pro.
          </p>
        </header>

        <section class="about-section">
          <h2 class="about-section-title">Notre histoire</h2>
          <p>
            Bloop a démarré comme un projet étudiant, porté par l'envie de
            rendre la création musicale accessible à celles et ceux qui n'ont
            jamais touché à un logiciel de production. Pas de DAW à 300€, pas de
            tutoriel de trois heures pour comprendre l'interface&nbsp;: on
            voulait un outil qui s'ouvre dans un navigateur et qui se comprend
            en quelques minutes.
          </p>
          <p>
            Depuis, le projet a grandi autour d'une bibliothèque de sons
            gratuite et d'une communauté qui partage, remixe et s'inspire des
            créations des autres.
          </p>
        </section>

        <section class="about-section">
          <h2 class="about-section-title">Ce qu'on défend</h2>
          <div class="values-grid">
            <div
              v-for="value in landingContent.aboutSection"
              :key="value.title"
              class="value-card"
            >
              <div class="value-icon">
                <i :class="value.icon"></i>
              </div>
              <h3>{{ value.title }}</h3>
              <p>{{ value.description }}</p>
            </div>
          </div>
        </section>

        <section class="about-cta">
          <h2>Envie d'essayer ?</h2>
          <p>
            Ta première création t'attend, elle ne prend que quelques minutes.
          </p>
          <BaseButton
            to="/register"
            label="Créer gratuitement"
            color="gradient"
            size="large"
            @click="goToRegisterPage"
          />
        </section>
      </div>
    </main>
    <LandingFooter />
  </LandingLayout>
</template>

<script setup lang="ts">
import LandingLayout from "../../layouts/LandingLayout.vue";
import LandingHeader from "../../components/landing/LandingHeader.vue";
import LandingFooter from "../../components/landing/LandingFooter.vue";
import BaseButton from "../../components/ui/BaseButton.vue";
import landingContent from "../../assets/data/landingContent.json";
import { useRouter } from "vue-router";

const router = useRouter();
const goToRegisterPage = () => {
  router.push("/register");
};
</script>

<style scoped>
.about-page {
  color: var(--color-white);
  padding: 8rem 0 6rem;
}

.about-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  flex-direction: column;
  gap: 4rem;
}

.about-header {
  text-align: center;
}

.about-ref {
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

.about-ref-tick {
  width: 10px;
  height: 1px;
  background: var(--color-accent);
}

.about-title {
  font-size: clamp(2.25rem, 4.5vw, 3.25rem);
  font-weight: 500;
  line-height: 1.2;
  margin-bottom: 1.25rem;
}

.about-title .highlight {
  color: var(--color-accent);
}

.about-intro {
  font-size: 1.15rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.65);
  max-width: 600px;
  margin: 0 auto;
}

.about-section {
  font-size: 1.05rem;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.7);
}

.about-section p {
  margin-bottom: 1rem;
}

.about-section p:last-child {
  margin-bottom: 0;
}

.about-section-title {
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--color-white);
  margin-bottom: 1.25rem;
}

.values-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.value-card {
  padding: 1.75rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-xl);
  text-align: center;
  transition: all 0.3s ease;
}

.value-card:hover {
  border-color: rgba(255, 210, 105, 0.3);
  transform: translateY(-3px);
}

.value-icon {
  font-size: 2rem;
  margin-bottom: 0.75rem;
}

.value-card h3 {
  font-size: 1.1rem;
  color: var(--color-white);
  margin-bottom: 0.5rem;
}

.value-card p {
  font-size: 0.9rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.6);
}

.about-cta {
  text-align: center;
  padding: 32px;
  background: linear-gradient(
    135deg,
    rgba(255, 210, 105, 0.08) 0%,
    rgba(145, 165, 249, 0.05) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-xl);
}

.about-cta h2 {
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--color-white);
  margin-bottom: 0.5rem;
}

.about-cta p {
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 1.5rem;
}

@media (max-width: 768px) {
  .about-page {
    padding: 6rem 0 4rem;
  }

  .about-container {
    padding: 0 1.5rem;
    gap: 3rem;
  }

  .values-grid {
    grid-template-columns: 1fr;
  }
}
</style>
