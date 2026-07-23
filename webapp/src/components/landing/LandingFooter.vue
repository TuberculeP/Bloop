<template>
  <footer class="footer" ref="footerRef">
    <div class="footer-glow"></div>

    <div class="footer-content">
      <!-- Main footer grid -->
      <div class="footer-main" :class="{ visible: isVisible }">
        <!-- Brand section -->
        <div class="footer-brand">
          <div class="brand-logo">
            <a href="/">
              <img
                src="../../assets/logo/logo_background_yellow.svg"
                alt="BLOOP"
                class="logo"
              />
            </a>
          </div>
          <p class="brand-description">
            Créez, mixez et produisez vos beats en ligne avec notre studio
            professionnel. La musique sans limites.
          </p>
          <div class="social-links">
            <BaseTooltip
              v-for="social in landingContent.socialMedia"
              :key="social.name"
              :text="social.name"
            >
              <a
                :href="social.link"
                class="social-link"
                :aria-label="social.name"
              >
                <i :class="social.icon" />
              </a>
            </BaseTooltip>
          </div>
        </div>

        <!-- Links sections -->
        <div class="footer-links">
          <div
            class="links-column"
            v-for="(column, index) in landingContent.footerLinks"
            :key="column.title"
            :style="{ '--delay': index * 0.1 + 's' }"
          >
            <h4 class="column-title">{{ column.title }}</h4>
            <ul class="column-links">
              <li v-for="link in column.links" :key="link.label">
                <a :href="link.link" class="footer-link">
                  <span class="link-text">{{ link.label }}</span>
                  <svg
                    class="link-arrow"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Newsletter section -->
      <div class="newsletter-section" :class="{ visible: isVisible }">
        <div class="newsletter-content">
          <div class="newsletter-text">
            <h4 class="newsletter-title">Restez informé</h4>
            <p class="newsletter-description">
              Recevez les dernières mises à jour et nouveautés directement dans
              votre boîte mail.
            </p>
          </div>
          <form class="newsletter-form" @submit.prevent="handleSubscribe">
            <div class="input-wrapper">
              <svg
                class="input-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                ></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <input
                type="email"
                v-model="email"
                placeholder="Votre adresse email"
                class="newsletter-input"
                required
              />
            </div>
            <BaseButton
              color="gradient"
              type="submit"
              :label="isSubscribing ? 'Envoi...' : 'S\'abonner'"
              right-icon="far fa-paper-plane"
            />
          </form>
        </div>
        <div class="newsletter-decoration">
          <div class="decoration-circle"></div>
          <div class="decoration-circle"></div>
        </div>
      </div>

      <!-- Bottom bar -->
      <div class="footer-bottom" :class="{ visible: isVisible }">
        <div class="bottom-left">
          <p class="copyright">
            &copy; {{ currentYear }} BLOOP. Tous droits réservés.
          </p>
        </div>
        <div class="bottom-right">
          <a
            :href="link.link"
            class="legal-link"
            v-for="link in landingContent.footerLegalLinks"
            :key="link.id"
          >
            {{ link.title }}
          </a>
        </div>
      </div>
    </div>

    <!-- Back to top button -->
    <BaseButton
      color="accent"
      size="large"
      class="back-to-top"
      @click="scrollToTop"
      left-icon="fas fa-arrow-up"
    />
  </footer>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, inject } from "vue";
import BaseTooltip from "../ui/BaseTooltip.vue";
import BaseButton from "../ui/BaseButton.vue";
import landingContent from "../../assets/data/landingContent.json";

const footerRef = ref<HTMLElement | null>(null);
const isVisible = ref(false);
const email = ref("");
const isSubscribing = ref(false);

const currentYear = new Date().getFullYear();

// Scroll to top
const scrollToTop = () => {
  const scrollTo =
    inject<(target: string | number | HTMLElement, options?: object) => void>(
      "scrollTo",
    );

  if (scrollTo) {
    scrollTo("#main-header", { duration: 1.2 });
  } else {
    document
      .getElementById("main-header")
      ?.scrollIntoView({ behavior: "smooth" });
  }
};

// Newsletter subscribe
const handleSubscribe = async () => {
  if (!email.value) return;

  isSubscribing.value = true;
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1000));
  isSubscribing.value = false;
  email.value = "";
};

// Intersection observer
let observer: IntersectionObserver | null = null;

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          isVisible.value = true;
        }
      });
    },
    { threshold: 0.1 },
  );

  if (footerRef.value) {
    observer.observe(footerRef.value);
  }
});

onUnmounted(() => {
  if (observer) observer.disconnect();
});
</script>

<style scoped>
.footer {
  position: relative;
  color: var(--color-white);
  padding-top: 3rem;
  overflow: hidden;
}

.footer::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 210, 105, 0.3),
    transparent
  );
}

.footer-glow {
  position: absolute;
  top: -200px;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 400px;
  background: radial-gradient(
    ellipse,
    rgba(255, 210, 105, 0.05) 0%,
    transparent 70%
  );
  pointer-events: none;
}

.footer-content {
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

/* Main footer grid */
.footer-main {
  display: grid;
  grid-template-columns: 1.5fr 2fr;
  gap: 3rem;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s ease;
}

.footer-main.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Brand section */
.footer-brand {
  max-width: 300px;
  display: flex;
  gap: 24px;
  flex-direction: column;
  justify-content: space-between;
}

.brand-logo .logo {
  width: 120px;
  height: auto;
}

.brand-description {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.95rem;
}

/* Social links */
.social-links {
  display: flex;
  gap: 0.75rem;
}

.social-link {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  transition: all 0.3s ease;
}

.social-link:hover {
  background: rgba(255, 210, 105, 0.1);
  border-color: rgba(255, 210, 105, 0.3);
  color: var(--color-accent);
  transform: translateY(-3px);
}

/* Footer links */
.footer-links {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.links-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity 0.6s ease,
    transform 0.6s ease;
  transition-delay: var(--delay);
}

.footer-main.visible .links-column {
  opacity: 1;
  transform: translateY(0);
}

.column-title {
  font-size: 0.9rem;
  color: var(--color-white);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  position: relative;
  padding-bottom: 0.75rem;
}

.column-title::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: 24px;
  height: 2px;
  background: var(--color-accent);
  border-radius: 1px;
}

.column-links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.footer-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.footer-link:hover {
  color: var(--color-accent);
}

.link-arrow {
  opacity: 0;
  transform: translateX(-5px);
  transition: all 0.2s ease;
}

.footer-link:hover .link-arrow {
  opacity: 1;
  transform: translateX(0);
}

/* Newsletter section */
.newsletter-section {
  position: relative;
  background: linear-gradient(
    135deg,
    rgba(255, 210, 105, 0.08) 0%,
    rgba(145, 165, 249, 0.05) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 2rem 2.5rem;
  overflow: hidden;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.8s ease 0.2s;
}

.newsletter-section.visible {
  opacity: 1;
  transform: translateY(0);
}

.newsletter-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 3rem;
}

.newsletter-title {
  font-size: 1.25rem;
  color: var(--color-white);
  margin-bottom: 0.5rem;
}

.newsletter-description {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  max-width: 350px;
}

.newsletter-form {
  display: flex;
  gap: 0.75rem;
  flex-shrink: 0;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 1rem;
  color: rgba(255, 255, 255, 0.4);
  pointer-events: none;
}

.newsletter-input {
  width: 280px;
  padding: 0.875rem 1rem 0.875rem 2.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: var(--color-white);
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.newsletter-input:focus {
  outline: none;
  border-color: rgba(255, 210, 105, 0.5);
  background: rgba(255, 255, 255, 0.08);
}

.newsletter-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.newsletter-decoration {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 300px;
  pointer-events: none;
}

.decoration-circle {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 210, 105, 0.1);
}

.decoration-circle:nth-child(1) {
  width: 200px;
  height: 200px;
  top: -50px;
  right: -50px;
}

.decoration-circle:nth-child(2) {
  width: 150px;
  height: 150px;
  bottom: -30px;
  right: 50px;
}

/* Footer bottom */
.footer-bottom {
  padding: 1.5rem 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  opacity: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  transform: translateY(20px);
  transition: all 0.8s ease 0.4s;
}

.footer-bottom.visible {
  opacity: 1;
  transform: translateY(0);
}

.copyright {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
}

.bottom-right {
  display: flex;
  gap: 1.5rem;
}

.legal-link {
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  font-size: 0.85rem;
  transition: color 0.2s ease;
}

.legal-link:hover {
  color: var(--color-accent);
}

/* Back to top button */
.back-to-top {
  position: fixed;
  bottom: 2rem;
  right: 1rem;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-lg);
  color: var(--color-black);
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 100;
}

.back-to-top:hover {
  box-shadow: 0 0 30px rgba(255, 210, 105, 0.4);
}

/* ==================== RESPONSIVE ==================== */

/* Tablette : la marque et les colonnes de liens passent en une
   seule colonne, contenu centré. */
@media (max-width: 1024px) {
  .footer-main {
    grid-template-columns: 1fr;
    gap: 3rem;
  }

  .footer-brand {
    max-width: 100%;
    gap: 14px;
    text-align: center;
  }

  .social-links {
    justify-content: center;
  }

  .newsletter-content {
    flex-direction: column;
    text-align: center;
  }

  .newsletter-text {
    margin-bottom: 1rem;
  }

  .newsletter-description {
    max-width: 100%;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .footer {
    padding: 3rem 0 1.5rem;
  }

  .footer-content {
    padding: 0 1.5rem;
    gap: 2.5rem;
  }

  .footer-links {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem 1rem;
  }

  .newsletter-section {
    padding: 2rem 1.5rem;
  }

  .newsletter-form {
    flex-direction: column;
    width: 100%;
  }

  .newsletter-input {
    width: 100%;
  }

  /* Le vrai bouton est rendu par BaseButton : on cible son bouton
     interne pour qu'il prenne toute la largeur, comme le champ email. */
  .newsletter-form :deep(button) {
    width: 100%;
    justify-content: center;
  }

  .footer-bottom {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
    padding: 1.5rem 0;
  }

  .bottom-right {
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
  }

  .back-to-top {
    width: 44px;
    height: 44px;
    bottom: 1.25rem;
    right: 1rem;
  }
}

/* Petit mobile */
@media (max-width: 480px) {
  .footer-links {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    text-align: center;
  }

  .column-title::after {
    left: 50%;
    transform: translateX(-50%);
  }

  /* Les cercles décoratifs débordent sur les très petits écrans une
     fois le contenu de la newsletter empilé : on les masque. */
  .newsletter-decoration {
    display: none;
  }

  .back-to-top {
    width: 40px;
    height: 40px;
    bottom: 1rem;
    right: 1rem;
  }
}
</style>
