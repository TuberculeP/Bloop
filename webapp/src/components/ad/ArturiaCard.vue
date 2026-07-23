<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useAdsStore } from "../../stores/adsStore";

interface Props {
  brand?: string;
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaLink?: string;
  imageUrl?: string;
}

const props = withDefaults(defineProps<Props>(), {
  brand: "Arturia",
  title: "Des synthés qui sonnent comme vos idées",
  description:
    "Synthés hardware, contrôleurs et V Collection : le studio d'Arturia pour aller plus loin que le navigateur.",
  ctaLabel: "Explore the offers",
  ctaLink: "#",
  imageUrl: "",
});

const adsStore = useAdsStore();
const { isEnabled } = storeToRefs(adsStore);
</script>

<template>
  <a
    v-if="isEnabled"
    :href="props.ctaLink"
    class="partner-card"
    target="_blank"
    rel="noopener noreferrer sponsored"
  >
    <div class="partner-card-visual">
      <img
        v-if="props.imageUrl"
        :src="props.imageUrl"
        :alt="props.brand"
        class="partner-card-img"
      />
      <svg
        v-else
        class="partner-card-placeholder"
        viewBox="0 0 200 120"
        fill="none"
        aria-hidden="true"
      >
        <!-- Blocs géométriques dans l'esprit du hero Arturia -->
        <rect x="0" y="0" width="200" height="120" fill="#f4f4f4" />
        <rect x="70" y="0" width="130" height="120" fill="#e8ecfb" />
        <rect
          x="120"
          y="0"
          width="80"
          height="120"
          fill="var(--partner-blue)"
          opacity="0.85"
        />
        <circle cx="95" cy="55" r="26" fill="var(--partner-orange)" />
        <g stroke="rgba(0,0,0,0.15)" stroke-width="1">
          <line x1="110" y1="0" x2="110" y2="120" />
          <line x1="130" y1="0" x2="130" y2="120" />
          <line x1="150" y1="0" x2="150" y2="120" />
          <line x1="0" y1="30" x2="200" y2="30" />
          <line x1="0" y1="60" x2="200" y2="60" />
          <line x1="0" y1="90" x2="200" y2="90" />
        </g>
      </svg>
    </div>

    <div class="partner-card-content">
      <div class="partner-card-brand">
        <span class="partner-card-logo" aria-hidden="true">
          <svg viewBox="0 0 40 40" width="18" height="18">
            <circle cx="20" cy="20" r="20" fill="var(--partner-accent)" />
            <circle
              cx="20"
              cy="20"
              r="10"
              fill="none"
              stroke="#000"
              stroke-width="3"
            />
            <circle cx="20" cy="20" r="2.5" fill="#000" />
          </svg>
        </span>
        <span class="partner-card-brand-text">{{ props.brand }}</span>
      </div>

      <p class="partner-card-title">{{ props.title }}</p>
      <p class="partner-card-description">{{ props.description }}</p>

      <span class="partner-card-cta">
        <span class="partner-card-cta-bar" aria-hidden="true"></span>
        {{ props.ctaLabel }}
      </span>
    </div>
  </a>
</template>

<style scoped>
/* stylelint-disable color-no-hex -- couleurs signature de la marque partenaire (Arturia : turquoise/bleu/orange), pas des tokens du design system */
.partner-card {
  --partner-accent: #12e4c5;
  --partner-blue: #1c1cff;
  --partner-orange: #ff5b1f;

  display: flex;
  flex-direction: column;
  max-width: 340px;
  background: #ffffff;
  border: 2px solid #0a0a0a;
  border-radius: 14px;
  overflow: hidden;
  text-decoration: none;
  transition: all 0.25s ease;
}

.partner-card:hover {
  transform: translateY(-4px);
  box-shadow: 6px 6px 0 #0a0a0a;
}
/* stylelint-enable color-no-hex */

.partner-card-visual {
  position: relative;
  height: 150px;
  border-bottom: 2px solid #0a0a0a;
  overflow: hidden;
}

.partner-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.partner-card-placeholder {
  width: 100%;
  height: 100%;
  display: block;
}

.partner-card-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.25rem 1.5rem 1.5rem;
}

.partner-card-brand {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.partner-card-logo {
  display: flex;
}

.partner-card-brand-text {
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #0a0a0a;
}

.partner-card-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.3;
  color: #0a0a0a;
}

.partner-card-description {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.55;
  color: rgba(10, 10, 10, 0.65);
}

.partner-card-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.6rem;
  padding: 0.6rem 1.1rem;
  width: fit-content;
  background: var(--partner-blue);
  border-radius: 6px;
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 700;
}

.partner-card-cta-bar {
  width: 3px;
  height: 14px;
  background: #ffffff;
  opacity: 0.7;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .partner-card {
    max-width: 100%;
  }
}
</style>
