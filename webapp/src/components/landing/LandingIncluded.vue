<template>
  <section class="included-section" ref="sectionRef">
    <div class="section-container">
      <!-- Header -->
      <div class="section-header" :class="{ visible: isVisible }">
        <!-- <span class="section-tag">Tout inclus</span> -->
        <h2 class="section-title">Inclus de base</h2>
        <p class="section-subtitle">
          Cliquez sur une catégorie pour découvrir ce que BLOOP vous offre.
        </p>
      </div>

      <!-- Cards Container -->
      <div class="cards-container">
        <div
          v-for="(category, catIndex) in categories"
          :key="category.id"
          class="category-card"
          :class="{
            visible: isVisible,
            expanded: expandedCard === catIndex,
          }"
          :style="{ '--index': catIndex }"
          @click="toggleCard(catIndex)"
        >
          <!-- Card Header -->
          <div class="card-header">
            <div class="card-icon" :class="category.iconClass">
              <component :is="category.icon" />
            </div>
            <div class="card-info">
              <h3 class="card-title">{{ category.title }}</h3>
              <span class="card-count"
                >{{ category.features.length }} fonctionnalités</span
              >
            </div>
            <div class="expand-indicator">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
          </div>

          <!-- Expandable Features -->
          <div class="card-features">
            <div class="features-inner">
              <div
                v-for="(feature, featureIndex) in category.features"
                :key="feature.title"
                class="feature-item"
                :style="{ '--feature-index': featureIndex }"
              >
                <span class="feature-emoji">{{ feature.emoji }}</span>
                <div class="feature-content">
                  <h5 class="feature-title">{{ feature.title }}</h5>
                  <p class="feature-desc">{{ feature.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Background decoration -->
    <div class="section-bg">
      <div class="bg-gradient"></div>
      <div class="bg-particles">
        <div class="particle" :style="getParticleStyle()"></div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, h, type Component } from "vue";

const sectionRef = ref<HTMLElement | null>(null);
const isVisible = ref(false);
const expandedCard = ref<number | null>(null);

const toggleCard = (index: number) => {
  expandedCard.value = expandedCard.value === index ? null : index;
};

// SVG Icon components
const ShieldIcon: Component = {
  render() {
    return h(
      "svg",
      {
        width: 32,
        height: 32,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": 2,
      },
      [h("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" })],
    );
  },
};

const BoltIcon: Component = {
  render() {
    return h(
      "svg",
      {
        width: 32,
        height: 32,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": 2,
      },
      [h("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" })],
    );
  },
};

const StarIcon: Component = {
  render() {
    return h(
      "svg",
      {
        width: 32,
        height: 32,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": 2,
      },
      [
        h("path", {
          d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
        }),
      ],
    );
  },
};

const MusicIcon: Component = {
  render() {
    return h(
      "svg",
      {
        width: 32,
        height: 32,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": 2,
      },
      [
        h("path", { d: "M9 18V5l12-2v13" }),
        h("circle", { cx: 6, cy: 18, r: 3 }),
        h("circle", { cx: 18, cy: 16, r: 3 }),
      ],
    );
  },
};

// Categories data
const categories = [
  {
    id: "security",
    title: "Sécurité & Stabilité",
    icon: ShieldIcon,
    iconClass: "security",
    glowClass: "glow-green",
    features: [
      {
        emoji: "🛡️",
        title: "Connexion sécurisée",
        description: "Sessions chiffrées SSL",
      },
      {
        emoji: "🚨",
        title: "Reprise automatique",
        description: "Récupération après crash",
      },
      {
        emoji: "🔒",
        title: "Sessions isolées",
        description: "Projets indépendants",
      },
      {
        emoji: "🕵️",
        title: "Protection cloud",
        description: "Sauvegardes automatiques",
      },
    ],
  },
  {
    id: "performance",
    title: "Performance & Vitesse",
    icon: BoltIcon,
    iconClass: "performance",
    glowClass: "glow-yellow",
    features: [
      { emoji: "⚡", title: "Audio temps réel", description: "Zéro latence" },
      {
        emoji: "🚀",
        title: "Interface fluide",
        description: "Réactivité maximale",
      },
      {
        emoji: "🌐",
        title: "Accès partout",
        description: "Studio dans le cloud",
      },
      {
        emoji: "🔗",
        title: "Collaboration live",
        description: "Travail en équipe",
      },
    ],
  },
  {
    id: "pro",
    title: "Outils Pro",
    icon: StarIcon,
    iconClass: "pro",
    glowClass: "glow-blue",
    features: [
      {
        emoji: "🎹",
        title: "Piano roll",
        description: "Composition intuitive",
      },
      {
        emoji: "🎤",
        title: "Enregistrement",
        description: "Micro & instruments",
      },
      {
        emoji: "🎛️",
        title: "Effets live",
        description: "EQ, reverb, delay...",
      },
      { emoji: "📤", title: "Export pro", description: "MP3, WAV, stems" },
    ],
  },
  {
    id: "creative",
    title: "Création Musicale",
    icon: MusicIcon,
    iconClass: "creative",
    glowClass: "glow-purple",
    features: [
      { emoji: "📁", title: "Import facile", description: "Glissé-déposé" },
      {
        emoji: "🧠",
        title: "Interface intuitive",
        description: "Prise en main rapide",
      },
      {
        emoji: "🎨",
        title: "Presets inclus",
        description: "Sons prêts à l'emploi",
      },
      { emoji: "🔄", title: "Historique", description: "Annuler illimité" },
    ],
  },
];

// Generate particle styles
const getParticleStyle = () => {
  const size = Math.random() * 4 + 2;
  const left = Math.random() * 100;
  const delay = Math.random() * 5;
  const duration = Math.random() * 10 + 15;
  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `${left}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
  };
};

// Intersection Observer
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

  if (sectionRef.value) {
    observer.observe(sectionRef.value);
  }
});

onUnmounted(() => {
  if (observer) observer.disconnect();
});
</script>

<style scoped>
.included-section {
  overflow: hidden;

  perspective: 1000px;
  position: relative;
  display: flex;
  align-items: center;
}

.section-container {
  position: relative;
  z-index: 1;
  margin: 0 auto;
  max-width: 1200px;
  width: 100%;
}

/* Background */
.section-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.bg-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(145, 165, 249, 0.02) 30%,
    rgba(255, 210, 105, 0.02) 70%,
    transparent 100%
  );
}

.bg-particles {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.particle {
  position: absolute;
  bottom: -10px;
  background: rgba(255, 210, 105, 0.3);
  border-radius: 50%;
  animation: float-up linear infinite;
  opacity: 0;
}

@keyframes float-up {
  0% {
    transform: translateY(0) scale(0);
    opacity: 0;
  }
  10% {
    opacity: 0.6;
    transform: translateY(-10vh) scale(1);
  }
  90% {
    opacity: 0.3;
  }
  100% {
    transform: translateY(-100vh) scale(0.5);
    opacity: 0;
  }
}

/* Section header */
.section-header {
  text-align: center;
  margin-bottom: 3rem;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s ease;
}

.section-header.visible {
  opacity: 1;
  transform: translateY(0);
}

.section-tag {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: rgba(145, 165, 249, 0.1);
  border: 1px solid rgba(145, 165, 249, 0.2);
  border-radius: 50px;
  font-size: 0.85rem;
  color: var(--color-secondary);
  margin-bottom: 1rem;
}

.section-title {
  font-size: clamp(2rem, 4vw, 3rem);
  margin-bottom: 1rem;
}

.section-subtitle {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.6);
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.7;
}

/* Cards Container - Accordion Style */
.cards-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Category Card */
.category-card {
  position: relative;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-xl);
  cursor: pointer;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: calc(var(--index) * 0.08s);
  overflow: hidden;
}

.category-card.visible {
  opacity: 1;
  transform: translateY(0);
}

.category-card:hover {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
}

.category-card.expanded {
  border-color: rgba(255, 210, 105, 0.3);
  background: rgba(255, 255, 255, 0.04);
}

/* Card Header */
.card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  flex-shrink: 0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.category-card.expanded .card-icon {
  transform: scale(1.05);
}

.card-icon.security {
  background: linear-gradient(
    135deg,
    rgba(96, 189, 97, 0.2) 0%,
    rgba(96, 189, 97, 0.05) 100%
  );
  color: var(--color-validate);
  border: 1px solid rgba(96, 189, 97, 0.3);
}

.card-icon.performance {
  background: linear-gradient(
    135deg,
    rgba(255, 210, 105, 0.2) 0%,
    rgba(255, 210, 105, 0.05) 100%
  );
  color: var(--color-accent);
  border: 1px solid rgba(255, 210, 105, 0.3);
}

.card-icon.pro {
  background: linear-gradient(
    135deg,
    rgba(145, 165, 249, 0.2) 0%,
    rgba(145, 165, 249, 0.05) 100%
  );
  color: var(--color-warning);
  border: 1px solid rgba(145, 165, 249, 0.3);
}

.card-icon.creative {
  background: linear-gradient(
    135deg,
    rgba(200, 145, 249, 0.2) 0%,
    rgba(200, 145, 249, 0.05) 100%
  );
  /* stylelint-disable-next-line color-no-hex -- couleur de catégorie illustrative, usage unique */
  color: #c891f9;
  border: 1px solid rgba(200, 145, 249, 0.3);
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 1.1rem;
  color: var(--color-white);
  margin: 0 0 0.25rem 0;
  transition: all 0.3s ease;
}

.category-card.expanded .card-title {
  color: var(--color-accent);
}

.card-count {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
}

.expand-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.4);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.category-card:hover .expand-indicator {
  background: rgba(255, 255, 255, 0.08);
}

.category-card.expanded .expand-indicator {
  transform: rotate(45deg);
  background: rgba(255, 210, 105, 0.2);
  color: var(--color-accent);
}

/* Card Features - Expandable */
.card-features {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.category-card.expanded .card-features {
  grid-template-rows: 1fr;
}

.features-inner {
  overflow: hidden;
}

.category-card.expanded .features-inner {
  padding: 0 1.5rem 1.5rem;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  padding: 0.875rem 1rem;
  margin-bottom: 0.5rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-lg);
  opacity: 0;
  transform: translateY(-10px);
  transition: all 0.3s ease;
  transition-delay: calc(var(--feature-index) * 0.05s + 0.1s);
}

.category-card.expanded .feature-item {
  opacity: 1;
  transform: translateY(0);
}

.feature-item:last-child {
  margin-bottom: 0;
}

.feature-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.feature-emoji {
  font-size: 1.25rem;
  line-height: 1.2;
  flex-shrink: 0;
  transition: transform 0.3s ease;
}

.feature-item:hover .feature-emoji {
  transform: scale(1.15);
}

.feature-content {
  flex: 1;
  min-width: 0;
}

.feature-title {
  font-size: 0.9rem;
  color: var(--color-white);
  margin: 0 0 0.2rem 0;
}

.feature-desc {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.4;
  margin: 0;
}

/* Responsive */
@media (max-width: 600px) {
  .included-section {
    padding: 4rem 0;
  }

  .section-container {
    padding: 0 1rem;
  }

  .section-header {
    margin-bottom: 2rem;
  }

  .card-header {
    padding: 1rem 1.25rem;
  }

  .card-icon {
    width: 44px;
    height: 44px;
  }

  .card-title {
    font-size: 1rem;
  }

  .category-card.expanded .features-inner {
    padding: 0 1.25rem 1.25rem;
  }

  .feature-item {
    padding: 0.75rem;
  }
}
</style>
