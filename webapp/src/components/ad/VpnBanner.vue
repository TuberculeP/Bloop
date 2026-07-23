<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "../../stores/authStore";

interface Props {
  brand?: string;
  tagline?: string;
  ctaLabel?: string;
  ctaLink?: string;
  offerTitle?: string;
  offerHighlight?: string;
  offerSubtitle?: string;
  imageUrl?: string;
  dismissible?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  brand: "NordVPN",
  tagline: "Tous vos contenus disponibles en France",
  ctaLabel: "Débloquer",
  ctaLink: "#",
  offerTitle: "3 mois gratuits puis",
  offerHighlight: "-70% en exclusivité",
  offerSubtitle: "avec NordVPN",
  imageUrl: "",
  dismissible: true,
});

const emit = defineEmits<{
  (e: "dismiss"): void;
}>();

const STORAGE_KEY = "ad-app";

const authStore = useAuthStore();
const isAdmin = computed(() => authStore.user?.role === "ROLE_ADMIN");

// Le close n'apparaît que si la page l'autorise ET que l'utilisateur est admin.
const canDismiss = computed(() => props.dismissible && isAdmin.value);

const visible = ref(true);

onMounted(() => {
  // Si un admin a déjà fermé la bannière sur ce navigateur, elle reste masquée
  // (peu importe la page, la clé de storage est partagée).
  if (localStorage.getItem(STORAGE_KEY) === "false") {
    visible.value = false;
  }
});

// Expose l'état de visibilité pour que le parent puisse gérer son propre layout
// (ex: gap en bas de page si la pub n'est pas affichée).
defineExpose({
  visible,
});

const dismiss = () => {
  if (!canDismiss.value) return;

  visible.value = false;
  localStorage.setItem(STORAGE_KEY, "false");
  emit("dismiss");
};
</script>

<template>
  <div v-if="visible" class="promo-banner">
    <button
      v-if="canDismiss"
      type="button"
      class="promo-close"
      aria-label="Fermer la bannière"
      @click="dismiss"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>

    <div class="promo-left">
      <div class="promo-logo">
        <span class="promo-logo-icon" aria-hidden="true">
          <svg
            viewBox="3 -21.95 244 244"
            xmlns="http://www.w3.org/2000/svg"
            width="26"
            height="26"
          >
            <path
              clip-rule="evenodd"
              d="M26.2 197C11.6 176.9 3 152.1 3 125.2 3 57.7 57.6 3 125 3s122 54.7 122 122.3c0 26.8-8.6 51.6-23.2 71.8l-58.6-95.4-5.7 9.6 5.7 26.6-40.3-69-24.8 42.1 5.8 26.9-21.1-36.1z"
              fill="#FFFFFF"
              fill-rule="evenodd"
            />
          </svg>
        </span>
        <span class="promo-logo-text">{{ props.brand }}</span>
      </div>
      <p class="promo-tagline">{{ props.tagline }}</p>
    </div>

    <a :href="props.ctaLink" class="promo-cta" rel="noopener noreferrer">
      <i class="fas fa-arrow-right" />
      <span>{{ props.ctaLabel.toUpperCase() }}</span>
    </a>

    <div class="promo-right">
      <p class="promo-offer">
        {{ props.offerTitle }}
        <strong class="promo-offer-highlight">{{
          props.offerHighlight
        }}</strong>
      </p>
      <span class="promo-subtitle">{{
        props.offerSubtitle.toUpperCase()
      }}</span>
    </div>

    <div class="promo-visual">
      <img
        v-if="props.imageUrl"
        :src="props.imageUrl"
        :alt="props.brand"
        class="promo-visual-img"
      />
      <svg
        v-else
        class="promo-visual-placeholder"
        width="60"
        height="60"
        viewBox="0 0 60 60"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="18"
          y="4"
          width="26"
          height="52"
          rx="5"
          fill="rgba(255,255,255,0.12)"
          stroke="rgba(255,255,255,0.25)"
        />
        <rect
          x="24"
          y="12"
          width="14"
          height="24"
          rx="2"
          fill="rgba(255,255,255,0.2)"
        />
        <circle cx="31" cy="48" r="2.5" fill="rgba(255,255,255,0.3)" />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.promo-banner {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 1.5rem;
  width: 100%;
  min-height: 90px;
  padding: 0.75rem 3.5rem 0.75rem 2rem;
  overflow: hidden;
  background: linear-gradient(100deg, #5b3164 0%, #95346a 100%);
  color: var(--color-white);
}

.promo-close {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 2;
}

.promo-close:hover {
  background: rgba(255, 255, 255, 0.16);
  color: var(--color-white);
}

.promo-left {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
}

.promo-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.promo-logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  color: var(--color-white);
}

.promo-logo-text {
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: 0.01em;
}

.promo-tagline {
  margin: 0;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.3;
  max-width: 220px;
  text-align: center;
}

.promo-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.9rem 1.75rem;
  background: #bf3470;
  border-radius: 12px;
  color: var(--color-white);
  font-weight: 800;
  font-size: 1rem;
  letter-spacing: 0.02em;
  text-decoration: none;
  white-space: nowrap;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.promo-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  text-align: right;
  white-space: nowrap;
}

.promo-offer {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-white);
}

.promo-offer-highlight {
  color: #ff6fb8;
  font-weight: 800;
}

.promo-subtitle {
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.55);
}

.promo-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.promo-visual-img {
  height: 100%;
  max-height: 90px;
  width: auto;
  object-fit: contain;
}

@media (max-width: 1024px) {
  .promo-banner {
    grid-template-columns: auto 1fr auto;
    padding-right: 2.5rem;
  }

  .promo-visual {
    display: none;
  }
}

@media (max-width: 768px) {
  .promo-banner {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
    gap: 0.75rem;
    padding: 1.25rem 2.5rem;
  }

  .promo-tagline {
    max-width: none;
  }

  .promo-right {
    align-items: center;
    text-align: center;
  }

  .promo-cta {
    width: 100%;
    justify-content: center;
  }
}
</style>
