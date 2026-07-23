<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useAdsStore } from "../../stores/adsStore";

interface Props {
  brand?: string;
  tagline?: string;
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaLink?: string;
  imageUrl?: string;
}

const props = withDefaults(defineProps<Props>(), {
  brand: "audiofanzine",
  tagline: "web in, audio out",
  title: "Teste avant d'acheter, économise en seconde main",
  description:
    "Des milliers de tests de matériel home studio et des petites annonces entre musiciens pour équiper ton setup sans se ruiner.",
  ctaLabel: "Découvrir Audiofanzine",
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
        <rect
          x="0"
          y="0"
          width="200"
          height="120"
          fill="var(--partner-coral)"
        />
        <rect x="0" y="0" width="120" height="120" fill="#000" opacity="0.15" />
        <text
          x="14"
          y="55"
          fill="#ffffff"
          font-family="Arial, sans-serif"
          font-weight="800"
          font-size="22"
        >
          TESTS
        </text>
        <text
          x="14"
          y="80"
          fill="#ffffff"
          font-family="Arial, sans-serif"
          font-weight="800"
          font-size="22"
        >
          MATOS
        </text>
        <rect
          x="150"
          y="14"
          width="38"
          height="20"
          rx="4"
          fill="var(--partner-yellow)"
        />
        <text
          x="157"
          y="28"
          fill="#0a0f16"
          font-family="Arial, sans-serif"
          font-weight="800"
          font-size="10"
        >
          PROMO
        </text>
      </svg>
    </div>

    <div class="partner-card-content">
      <div class="partner-card-brand">
        <svg
          class="partner-card-logo"
          viewBox="0 0 24 16"
          width="22"
          height="15"
          aria-hidden="true"
        >
          <path
            d="M0 8 L4 8 L6 2 L9 14 L12 4 L14 8 L24 8"
            fill="none"
            stroke="#ffffff"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span class="partner-card-brand-text">{{ props.brand }}</span>
      </div>
      <span class="partner-card-tagline">{{ props.tagline }}</span>

      <p class="partner-card-title">{{ props.title }}</p>
      <p class="partner-card-description">{{ props.description }}</p>

      <span class="partner-card-cta">
        {{ props.ctaLabel }}
        <i class="fas fa-arrow-right" aria-hidden="true"></i>
      </span>
    </div>
  </a>
</template>

<style scoped>
/* stylelint-disable color-no-hex -- couleurs signature de la marque partenaire (Audiofanzine : navy/corail/jaune), pas des tokens du design system */
.partner-card {
  --partner-navy: #182430;
  --partner-coral: #ec4630;
  --partner-yellow: #ffcc00;

  display: flex;
  flex-direction: column;
  background: var(--partner-navy);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-xl);
  overflow: hidden;
  text-decoration: none;
  transition: all 0.3s ease;
}

.partner-card:hover {
  transform: translateY(-4px);
  border-color: rgba(236, 70, 48, 0.4);
  box-shadow: 0 12px 30px rgba(236, 70, 48, 0.15);
}
/* stylelint-enable color-no-hex */

.partner-card-visual {
  position: relative;
  height: 150px;
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
  gap: 0.35rem;
  padding: 1.25rem 1.5rem 1.5rem;
}

.partner-card-brand {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.partner-card-brand-text {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-white);
}

.partner-card-tagline {
  font-size: 0.65rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 0.4rem;
}

.partner-card-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--color-white);
}

.partner-card-description {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.6);
}

.partner-card-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--partner-coral);
}

.partner-card-cta i {
  font-size: 0.8rem;
  transition: transform 0.2s ease;
}

.partner-card:hover .partner-card-cta i {
  transform: translateX(3px);
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .partner-card {
    max-width: 100%;
  }
}
</style>
