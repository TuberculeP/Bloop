<template>
  <footer class="footer" ref="footerRef">
    <div class="footer-glow"></div>

    <div class="footer-content">
      <!-- Main footer grid -->
      <div class="footer-main" :class="{ visible: isVisible }">
        <!-- Brand section -->
        <div class="footer-brand">
          <div class="brand-logo">
            <img
              src="../../assets/logo/logo_background_yellow.svg"
              alt="BLOOP"
              class="logo"
            />
          </div>
          <p class="brand-description">
            Créez, mixez et produisez vos beats en ligne avec notre studio
            professionnel. La musique sans limites.
          </p>
          <div class="social-links">
            <BaseTooltip
              v-for="social in socials"
              :key="social.name"
              :text="social.name"
            >
              <a href="#" class="social-link" :aria-label="social.name">
                <component :is="social.icon" />
              </a>
            </BaseTooltip>
          </div>
        </div>

        <!-- Links sections -->
        <div class="footer-links">
          <div
            class="links-column"
            v-for="(column, index) in footerLinks"
            :key="column.title"
            :style="{ '--delay': index * 0.1 + 's' }"
          >
            <h4 class="column-title">{{ column.title }}</h4>
            <ul class="column-links">
              <li v-for="link in column.links" :key="link.label">
                <a :href="link.href" class="footer-link">
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
            <button
              type="submit"
              class="newsletter-btn"
              :class="{ loading: isSubscribing }"
            >
              <span class="btn-text">{{
                isSubscribing ? "Envoi..." : "S'abonner"
              }}</span>
              <svg
                class="btn-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
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
            href="#"
            class="legal-link"
            v-for="link in legalLinks"
            :key="link"
            >{{ link }}</a
          >
        </div>
      </div>
    </div>

    <!-- Back to top button -->
    <button
      class="back-to-top"
      :class="{ visible: showBackToTop }"
      @click="scrollToTop"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <line x1="12" y1="19" x2="12" y2="5"></line>
        <polyline points="5 12 12 5 19 12"></polyline>
      </svg>
    </button>
  </footer>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, h, inject } from "vue";
import BaseTooltip from "../ui/BaseTooltip.vue";

const footerRef = ref<HTMLElement | null>(null);
const isVisible = ref(false);
const showBackToTop = ref(false);
const email = ref("");
const isSubscribing = ref(false);

const currentYear = new Date().getFullYear();

// Social icons
const TwitterIcon = () =>
  h(
    "svg",
    { width: 18, height: 18, viewBox: "0 0 24 24", fill: "currentColor" },
    [
      h("path", {
        d: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
      }),
    ],
  );

const DiscordIcon = () =>
  h(
    "svg",
    { width: 18, height: 18, viewBox: "0 0 24 24", fill: "currentColor" },
    [
      h("path", {
        d: "M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z",
      }),
    ],
  );

const InstagramIcon = () =>
  h(
    "svg",
    {
      width: 18,
      height: 18,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2,
    },
    [
      h("rect", { x: 2, y: 2, width: 20, height: 20, rx: 5, ry: 5 }),
      h("path", { d: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" }),
      h("line", { x1: 17.5, y1: 6.5, x2: 17.51, y2: 6.5 }),
    ],
  );

const YoutubeIcon = () =>
  h(
    "svg",
    { width: 18, height: 18, viewBox: "0 0 24 24", fill: "currentColor" },
    [
      h("path", {
        d: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
      }),
    ],
  );

const socials = [
  { name: "Twitter", icon: TwitterIcon },
  { name: "Discord", icon: DiscordIcon },
  { name: "Instagram", icon: InstagramIcon },
  { name: "YouTube", icon: YoutubeIcon },
];

const footerLinks = [
  {
    title: "Produit",
    links: [
      { label: "Fonctionnalités", href: "#features" },
      { label: "Tarifs", href: "#about" },
      { label: "Roadmap", href: "#" },
      { label: "Changelog", href: "#" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "Documentation", href: "#" },
      { label: "Tutoriels", href: "#" },
      { label: "Blog", href: "/blog" },
      { label: "API", href: "#" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Centre d'aide", href: "#" },
      { label: "Communauté", href: "#" },
      { label: "Contact", href: "#" },
      { label: "Status", href: "#" },
    ],
  },
];

const legalLinks = ["Confidentialité", "CGU", "Cookies", "Mentions légales"];

// Scroll handler
const handleScroll = () => {
  showBackToTop.value = window.scrollY > 500;
};

// Scroll to top
const scrollToTop = () => {
  const scrollTo =
    inject<(target: string | number | HTMLElement, options?: object) => void>(
      "scrollTo",
    );

  if (scrollTo) {
    scrollTo("#hero", { duration: 1.2 });
  } else {
    document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" });
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

  window.addEventListener("scroll", handleScroll, { passive: true });
});

onUnmounted(() => {
  if (observer) observer.disconnect();
  window.removeEventListener("scroll", handleScroll);
});
</script>

<style scoped>
.footer {
  position: relative;
  color: var(--color-white);
  padding-top: 4rem;
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
  gap: 2rem;
}

/* Main footer grid */
.footer-main {
  min-height: 250px;
  display: grid;
  grid-template-columns: 1.5fr 2fr;
  gap: 4rem;
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
  gap: 2rem;
}

.links-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.6s ease forwards;
  animation-delay: var(--delay);
}

.footer-main.visible .links-column {
  opacity: 1;
  transform: translateY(0);
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.column-title {
  font-size: 0.9rem;
  font-weight: 600;
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
  gap: 12px;
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
  padding: 2.5rem;
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
  font-weight: 600;
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

.newsletter-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  background: linear-gradient(
    135deg,
    var(--color-accent) 0%,
    var(--color-accent-hover) 100%
  );
  border: none;
  border-radius: 10px;
  color: var(--color-black);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.newsletter-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255, 210, 105, 0.3);
}

.newsletter-btn.loading {
  opacity: 0.7;
  pointer-events: none;
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
  padding: 2rem 0;
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

@keyframes heartbeat {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
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
  transform: translateY(20px);
  transition: all 0.2s ease;
  z-index: 100;

  &:hover {
    box-shadow: 0 0 30px rgba(255, 210, 105, 0.4);
  }
}

/* Responsive */
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

  .footer-links {
    grid-template-columns: repeat(3, 1fr);
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

@media (max-width: 768px) {
  .footer {
    padding: 3rem 0 1.5rem;
  }

  .footer-content {
    padding: 0 1.5rem;
  }

  .footer-links {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }

  .newsletter-form {
    flex-direction: column;
    width: 100%;
  }

  .newsletter-input {
    width: 100%;
  }

  .newsletter-btn {
    width: 100%;
    justify-content: center;
  }

  .footer-bottom {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .bottom-right {
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
  }
}

@media (max-width: 480px) {
  .footer-links {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .column-title::after {
    left: 50%;
    transform: translateX(-50%);
  }

  .back-to-top {
    bottom: 1rem;
    right: 1rem;
    width: 40px;
    height: 40px;
  }
}
</style>
