<template>
  <main class="landing-main">
    <!-- ==================== HERO SECTION ==================== -->
    <section class="hero" id="hero" ref="heroRef">
      <div class="hero-container">
        <!-- Hero Content -->
        <div class="hero-content" ref="heroContentRef">
          <h1 class="hero-title" ref="heroTitleRef">
            <SplitText
              text="Compose, mixe, crée - sans rien installer"
              tag="span"
              class="title-line"
              :animation-type="heroTitleAnimType"
              :delay="0.2"
            />
          </h1>

          <p class="hero-description" ref="heroDescRef">
            BLOOP révolutionne la création musicale. Un studio professionnel
            dans votre navigateur, accessible partout, à tout moment. Liberez
            votre créativité.
          </p>

          <div class="hero-stats" ref="heroStatsRef">
            <div v-for="stat in stats" :key="stat.label" class="stat-item">
              <span class="stat-value">
                <CountUp
                  v-if="typeof stat.raw === 'number'"
                  :target="stat.raw"
                  :suffix="stat.suffix"
                />
                <span v-else>{{ stat.value }}</span>
              </span>
              <span class="stat-label">{{ stat.label }}</span>
            </div>
          </div>

          <div class="hero-actions" ref="heroActionsRef">
            <BaseButton
              size="large"
              color="gradient"
              label="Commencer gratuitement"
              @click="handleStartClick"
              left-icon="fas fa-play"
            />
            <BaseButton
              size="large"
              variant="outline"
              color="white"
              label="Découvrir"
              @click="scrollToFeatures"
              right-icon="fas fa-arrow-down"
            />
          </div>
        </div>

        <!-- Hero Visual - 3D Rotating Mockup -->
        <div class="hero-visual" ref="heroVisualRef">
          <div class="studio-mockup" ref="mockupRef">
            <div class="mockup-header">
              <div class="mockup-dots">
                <span></span><span></span><span></span>
              </div>
              <span class="mockup-title">BLOOP Studio</span>
            </div>
            <div class="mockup-content">
              <div class="waveform-container">
                <div
                  v-for="i in 40"
                  :key="i"
                  class="wave-bar"
                  :style="{ '--i': i }"
                ></div>
              </div>
              <div class="track-lanes">
                <div
                  v-for="track in mockupTracks"
                  :key="track.name"
                  class="track"
                >
                  <span class="track-name">{{ track.name }}</span>
                  <div class="track-blocks">
                    <div
                      v-for="(block, idx) in track.blocks"
                      :key="idx"
                      class="track-block"
                      :style="{
                        left: block.start + '%',
                        width: block.width + '%',
                        '--color': track.color,
                      }"
                    ></div>
                  </div>
                </div>
              </div>
              <div class="mockup-controls">
                <div class="control-btn play">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </div>
                <div class="timeline">
                  <div class="timeline-progress"></div>
                  <div class="timeline-head"></div>
                </div>
                <span class="time-display">02:34 / 04:12</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== FEATURES SECTION ==================== -->
    <section class="features" id="features" ref="featuresRef">
      <div class="section-container">
        <div class="section-header">
          <h2 class="section-title">
            <SplitText
              text="Tout ce dont vous avez besoin"
              animation-type="slide"
              trigger-start="top 85%"
            />
          </h2>
          <p class="section-subtitle">
            Des outils professionnels accessibles a tous les créateurs
          </p>
        </div>

        <div class="features-grid" ref="featuresGridRef">
          <div
            v-for="(feature, idx) in landingContent.features"
            :key="feature.title"
            class="feature-card"
            :ref="(el) => setFeatureCardRef(el, idx)"
            :style="{ '--color': feature.color }"
          >
            <div class="feature-morph">
              <MorphShape
                :size="60"
                :color="feature.color"
                from-shape="circle"
                to-shape="square"
                :scrub="1"
              />
            </div>
            <div class="feature-icon">
              <i :class="feature.icon" />
            </div>
            <h3 class="feature-title">{{ feature.title }}</h3>
            <p class="feature-description">{{ feature.description }}</p>
            <div class="feature-glow"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== HOW IT WORKS SECTION ==================== -->
    <section class="how-it-works" id="gallery" ref="howItWorksRef">
      <div class="section-container">
        <div class="section-header">
          <h2 class="section-title">
            <SplitText
              text="Comment ça marche ?"
              animation-type="fade"
              trigger-start="top 85%"
            />
          </h2>
        </div>

        <div class="steps-container" ref="stepsContainerRef">
          <svg
            class="steps-line-svg"
            ref="stepsLineSvgRef"
            viewBox="0 0 4 300"
            preserveAspectRatio="none"
          >
            <line class="line-bg" x1="2" y1="0" x2="2" y2="300" />
            <line
              class="line-progress"
              ref="lineProgressRef"
              x1="2"
              y1="0"
              x2="2"
              y2="300"
            />
          </svg>

          <div
            v-for="(step, index) in landingContent.steps"
            :key="step.title"
            class="step-item"
            :data-index="index"
          >
            <div class="step-number">
              {{ String(index + 1).padStart(2, "0") }}
            </div>
            <div class="step-content">
              <h3 class="step-title">{{ step.title }}</h3>
              <p class="step-description">{{ step.description }}</p>
            </div>
            <div class="step-visual">
              <div class="step-icon">
                <i :class="step.icon" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== PRICING SECTION ==================== -->
    <section class="pricing" id="about" ref="pricingRef">
      <div class="section-container">
        <div class="section-header">
          <h2 class="section-title">
            <SplitText
              text="Choisissez votre formule"
              animation-type="rotate3d"
              trigger-start="top 85%"
            />
          </h2>
          <p class="section-subtitle">
            Commencez gratuitement, évoluez selon vos besoins
          </p>
        </div>

        <div class="pricing-grid" ref="pricingGridRef">
          <div
            v-for="(plan, idx) in landingContent.pricingPlans"
            :key="plan.name"
            class="pricing-card"
            :class="{ popular: plan.popular }"
            :ref="(el) => setPricingCardRef(el, idx)"
          >
            <div v-if="plan.popular" class="popular-badge">
              <span>Plus populaire</span>
            </div>
            <div class="plan-content">
              <div class="plan-header">
                <h3 class="plan-name">{{ plan.name }}</h3>
                <div class="plan-price">
                  <span class="currency">EUR</span>
                  <span class="amount">
                    <CountUp
                      :target="parseFloat(plan.price)"
                      :decimals="plan.price.includes('.') ? 2 : 0"
                    />
                  </span>
                  <span class="period">/mois</span>
                </div>
                <p class="plan-description">{{ plan.description }}</p>
              </div>
              <div class="plan-separator" />
              <ul class="plan-features">
                <li
                  v-for="feature in plan.features"
                  :key="feature"
                  class="plan-feature"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>{{ feature }}</span>
                </li>
              </ul>
            </div>
            <button class="plan-btn" :class="{ primary: plan.popular }">
              {{ plan.cta }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== INCLUDED SECTION ==================== -->
    <LandingIncluded />

    <!-- ==================== MCP SECTION ==================== -->
    <section class="mcp-docs" id="mcp">
      <div class="section-container">
        <div class="section-header">
          <div class="mcp-badge">
            <span class="badge-dot"></span>
            <span>Claude Code Integration</span>
          </div>
          <h2 class="section-title">
            <SplitText
              text="Composez avec Claude"
              animation-type="rotate3d"
              trigger-start="top 85%"
            />
          </h2>
          <p class="section-subtitle">
            Connectez Claude Code à BLOOP et demandez-lui de créer, arranger et
            enrichir vos projets directement depuis votre éditeur.
          </p>
        </div>

        <div class="mcp-grid">
          <div class="mcp-steps">
            <div
              v-for="(step, i) in landingContent.mcpSteps"
              :key="i"
              class="mcp-step"
            >
              <div class="mcp-step-number">
                {{ String(i + 1).padStart(2, "0") }}
              </div>
              <div class="mcp-step-body">
                <h3 class="mcp-step-title">{{ step.title }}</h3>
                <p class="mcp-step-desc">{{ step.description }}</p>
              </div>
            </div>
          </div>

          <div class="mcp-config-card">
            <div class="config-header">
              <div class="config-dots">
                <span></span><span></span><span></span>
              </div>
              <span class="config-filename">.mcp.json</span>
              <button
                class="config-copy-btn"
                :class="{ copied: configCopied }"
                @click="copyMcpConfig"
              >
                <svg
                  v-if="!configCopied"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path
                    d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                  ></path>
                </svg>
                <svg
                  v-else
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>{{ configCopied ? "Copié !" : "Copier" }}</span>
              </button>
            </div>
            <pre class="config-code"><span class="json-brace">{</span>
  <span class="json-key">"mcpServers"</span><span class="json-colon">:</span> <span class="json-brace">{</span>
    <span class="json-key">"bloop"</span><span class="json-colon">:</span> <span class="json-brace">{</span>
      <span class="json-key">"type"</span><span class="json-colon">:</span> <span class="json-string">"sse"</span><span class="json-comma">,</span>
      <span class="json-key">"url"</span><span class="json-colon">:</span> <span class="json-string">"<span class="json-origin">{{ currentOrigin }}</span>/api/mcp/sse"</span>
    <span class="json-brace">}</span>
  <span class="json-brace">}</span>
<span class="json-brace">}</span></pre>
            <div class="config-footer">
              Ajoutez ce fichier à la racine de votre projet, puis rechargez
              Claude Code.
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== CTA SECTION ==================== -->
    <section class="cta-section" id="support" ref="ctaRef">
      <div class="section-container">
        <div class="cta-content" ref="ctaContentRef">
          <h2 class="cta-title">
            <SplitText
              text="Prêt à créer ?"
              animation-type="wave"
              trigger-start="top 80%"
            />
          </h2>
          <p class="cta-description">
            Rejoignez des milliers de créateurs qui utilisent BLOOP pour donner
            vie a leurs idées musicales.
          </p>
          <div class="cta-trust">
            <div class="trust-avatars">
              <img
                v-for="(avatar, index) in trustAvatars"
                :key="index"
                :src="avatar"
                :alt="`Créateur ${index + 1}`"
                class="trust-avatar"
              />
            </div>
            <span>
              +<CountUp :target="20000" :separator="' '" /> créateurs nous font
              confiance
            </span>
          </div>
          <div class="cta-actions">
            <BaseButton
              size="large"
              color="gradient"
              label="Lancer le studio"
              @click="handleStartClick"
              right-icon="fas fa-arrow-right"
            />
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  inject,
  type ComponentPublicInstance,
} from "vue";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import LandingIncluded from "./LandingIncluded.vue";
import SplitText from "./effects/SplitText.vue";
import CountUp from "./effects/CountUp.vue";
import MorphShape from "./effects/MorphShape.vue";
import BaseButton from "../ui/BaseButton.vue";
import { useRouter } from "vue-router";
import landingContent from "../../assets/data/landingContent.json";

gsap.registerPlugin(ScrollTrigger);

// --- Mobile stability fix -------------------------------------------------
// ignoreMobileResize: avoid ScrollTrigger recalculating (and shifting) all
// trigger positions every time the mobile browser's address bar shows/hides
// (this was the main cause of "nothing animates until I scroll to the
// bottom and back up").
// NOTE: we intentionally do NOT use ScrollTrigger.normalizeScroll(true) here
// — it takes over native scroll handling and can conflict with a custom
// smooth-scroll setup (like the injected `scrollTo`), sometimes locking
// scroll entirely on mobile/trackpad.
ScrollTrigger.config({ ignoreMobileResize: true });
const router = useRouter();

const isMobile = ref(
  typeof window !== "undefined"
    ? window.matchMedia("(max-width: 768px)").matches
    : false,
);

const handleStartClick = () => {
  router.push("/app");
};

// rotate3d relies on CSS perspective/3D transforms which some mobile
// browsers render with a horizontal offset while animating (this is what
// was making the hero title look "pushed to the right"). Use a flat fade
// on small screens instead.
const heroTitleAnimType = computed(() =>
  isMobile.value ? "fade" : "rotate3d",
);

let mobileMql: MediaQueryList | null = null;
const updateIsMobile = () => {
  isMobile.value = mobileMql ? mobileMql.matches : false;
};

const scrollTo =
  inject<(target: string | number | HTMLElement, options?: object) => void>(
    "scrollTo",
  );

// Refs
const heroRef = ref<HTMLElement | null>(null);
const heroBadgeRef = ref<HTMLElement | null>(null);
const heroDescRef = ref<HTMLElement | null>(null);
const heroStatsRef = ref<HTMLElement | null>(null);
const heroActionsRef = ref<HTMLElement | null>(null);
const heroVisualRef = ref<HTMLElement | null>(null);
const mockupRef = ref<HTMLElement | null>(null);
const featuresGridRef = ref<HTMLElement | null>(null);
const featureCardRefs = ref<HTMLElement[]>([]);
const stepsContainerRef = ref<HTMLElement | null>(null);
const lineProgressRef = ref<SVGLineElement | null>(null);
const pricingGridRef = ref<HTMLElement | null>(null);
const pricingCardRefs = ref<HTMLElement[]>([]);
const ctaRef = ref<HTMLElement | null>(null);
const ctaContentRef = ref<HTMLElement | null>(null);

const setFeatureCardRef = (
  el: Element | ComponentPublicInstance | null,
  index: number,
) => {
  if (el) featureCardRefs.value[index] = el as HTMLElement;
};

const setPricingCardRef = (
  el: Element | ComponentPublicInstance | null,
  index: number,
) => {
  if (el) pricingCardRefs.value[index] = el as HTMLElement;
};

// Data
const trustAvatars = [
  "https://i.pravatar.cc/150?img=1",
  "https://i.pravatar.cc/150?img=5",
  "https://i.pravatar.cc/150?img=8",
  "https://i.pravatar.cc/150?img=12",
];

const stats = [
  { value: "+20k", raw: 20000, suffix: "+", label: "Créateurs" },
  { value: "100%", raw: 100, suffix: "%", label: "Cloud" },
  { value: "infinity", label: "Possibilites" },
];

const mockupTracks = [
  {
    name: "Drums",
    color: "var(--color-accent)",
    blocks: [
      { start: 5, width: 25 },
      { start: 35, width: 30 },
      { start: 70, width: 25 },
    ],
  },
  {
    name: "Bass",
    color: "var(--color-accent2)",
    blocks: [
      { start: 10, width: 20 },
      { start: 40, width: 35 },
    ],
  },
  {
    name: "Synth",
    color: "var(--color-secondary)",
    blocks: [
      { start: 0, width: 15 },
      { start: 20, width: 25 },
      { start: 55, width: 40 },
    ],
  },
  {
    name: "Vocals",
    color: "var(--color-success)",
    blocks: [{ start: 25, width: 45 }],
  },
];

const currentOrigin = computed(() =>
  typeof window !== "undefined"
    ? window.location.origin
    : "https://bloop-on.cloud",
);

const configCopied = ref(false);

const copyMcpConfig = async () => {
  const config = JSON.stringify(
    {
      mcpServers: {
        bloop: {
          type: "sse",
          url: `${currentOrigin.value}/api/mcp/sse`,
        },
      },
    },
    null,
    2,
  );
  await navigator.clipboard.writeText(config);
  configCopied.value = true;
  setTimeout(() => {
    configCopied.value = false;
  }, 2000);
};

const scrollToFeatures = () => {
  if (scrollTo) {
    scrollTo("#features", { duration: 1.2 });
  } else {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  }
};

// GSAP Animations
const initHeroAnimations = () => {
  // Pas d'animation sur mobile : le contenu reste visible directement.
  if (isMobile.value) return;

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  // Filter out null values before setting initial states
  const validRefs = [
    heroBadgeRef.value,
    heroDescRef.value,
    heroStatsRef.value,
    heroActionsRef.value,
  ].filter((ref) => ref !== null);

  if (validRefs.length > 0) {
    gsap.set(validRefs, {
      opacity: 0,
      y: 30,
    });
  }

  if (heroVisualRef.value) {
    gsap.set(heroVisualRef.value, { opacity: 0, x: 100, rotateY: -15 });
  }

  // Badge animation
  if (heroBadgeRef.value) {
    tl.to(heroBadgeRef.value, { opacity: 1, y: 0, duration: 0.5 }, 0.15);
  }

  // Description
  if (heroDescRef.value) {
    tl.to(heroDescRef.value, { opacity: 1, y: 0, duration: 0.5 }, 0.35);
  }

  // Stats
  if (heroStatsRef.value) {
    tl.to(heroStatsRef.value, { opacity: 1, y: 0, duration: 0.5 }, 0.5);
  }

  // Actions
  if (heroActionsRef.value) {
    tl.to(heroActionsRef.value, { opacity: 1, y: 0, duration: 0.5 }, 0.65);
  }

  // Visual with 3D rotation
  if (heroVisualRef.value) {
    tl.to(
      heroVisualRef.value,
      {
        opacity: 1,
        x: 0,
        rotateY: 0,
        duration: 0.8,
        ease: "power2.out",
      },
      0.25,
    );
  }

  // Mockup 3D rotation on scroll — decorative only, skip on mobile where
  // scroll-linked transforms are the most prone to glitching.
  if (mockupRef.value && heroRef.value && !isMobile.value) {
    gsap.to(mockupRef.value, {
      rotateY: 15,
      rotateX: -5,
      scale: 0.95,
      scrollTrigger: {
        trigger: heroRef.value,
        start: "top top",
        end: "bottom top",
        scrub: 0.5,
      },
    });
  }
};

const initFeaturesAnimations = () => {
  // Pas d'animation sur mobile : les cartes restent visibles directement.
  if (isMobile.value) return;
  if (!featuresGridRef.value) return;

  featureCardRefs.value.forEach((card) => {
    if (!card) return;

    gsap.from(card, {
      y: 80,
      opacity: 0,
      scale: 0.95,
      duration: 0.7,
      ease: "power2.out",
      scrollTrigger: {
        trigger: card,
        start: "top 90%",
        toggleActions: "play none none none",
        once: true,
      },
    });

    // Icon rotation on scroll — purely decorative
    const icon = card.querySelector(".feature-icon");
    if (icon) {
      gsap.to(icon, {
        rotation: 360,
        scale: 1.1,
        scrollTrigger: {
          trigger: card,
          start: "top 80%",
          end: "top 30%",
          scrub: 1,
        },
      });
    }
  });
};

const initStepsAnimations = () => {
  // Pas d'animation sur mobile : étapes et ligne restent visibles telles quelles.
  if (isMobile.value) return;
  if (!stepsContainerRef.value || !lineProgressRef.value) return;

  // Self-drawing line (decorative, keep scrub but lighter)
  const lineLength = 300;
  gsap.set(lineProgressRef.value, {
    strokeDasharray: lineLength,
    strokeDashoffset: lineLength,
  });

  gsap.to(lineProgressRef.value, {
    strokeDashoffset: 0,
    scrollTrigger: {
      trigger: stepsContainerRef.value,
      start: "top 70%",
      end: "bottom 50%",
      scrub: 0.5,
    },
  });

  // Step items animation
  const stepItems = stepsContainerRef.value.querySelectorAll(".step-item");
  stepItems.forEach((step, idx) => {
    const stepNumber = step.querySelector(".step-number");

    gsap.from(step, {
      opacity: 0,
      x: idx % 2 === 0 ? -50 : 50,
      y: 0,
      duration: 0.7,
      ease: "power2.out",
      scrollTrigger: {
        trigger: step,
        start: "top 90%",
        toggleActions: "play none none none",
        once: true,
      },
    });

    // Step number activation
    gsap.to(stepNumber, {
      backgroundColor: "var(--color-secondary)",
      color: "var(--color-black)",
      scale: 1.1,
      boxShadow: "0 0 20px rgba(255, 210, 105, 0.3)",
      duration: 0.4,
      scrollTrigger: {
        trigger: step,
        start: "top 75%",
        toggleActions: "play none none reverse",
      },
    });
  });
};

const initPricingAnimations = () => {
  // Pas d'animation sur mobile : les cartes restent visibles directement.
  if (isMobile.value) return;
  if (!pricingGridRef.value) return;

  pricingCardRefs.value.forEach((card) => {
    if (!card) return;

    // Cards emerge from depth
    gsap.from(card, {
      z: -300,
      opacity: 0,
      rotateY: 30,
      y: 0,
      scale: 0.9,
      duration: 0.7,
      ease: "power2.out",
      scrollTrigger: {
        trigger: card,
        start: "top 90%",
        toggleActions: "play none none none",
        once: true,
      },
    });
  });
};

const initCtaAnimations = () => {
  // Pas d'animation sur mobile : le contenu du CTA reste visible directement.
  if (isMobile.value) return;
  if (!ctaContentRef.value) return;

  // CTA content dramatic reveal
  const title = ctaContentRef.value.querySelector(".cta-title");
  if (title) {
    gsap.from(title, {
      scale: 2,
      opacity: 0,
      filter: "blur(20px)",
      duration: 0.6,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ctaRef.value,
        start: "top 85%",
        toggleActions: "play none none none",
        once: true,
      },
    });
  }

  const desc = ctaContentRef.value.querySelector(".cta-description");
  if (desc) {
    gsap.from(desc, {
      y: 30,
      opacity: 0,
      duration: 0.5,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ctaRef.value,
        start: "top 80%",
        toggleActions: "play none none none",
        once: true,
      },
    });
  }

  // Trust avatars stagger
  const avatars = ctaContentRef.value.querySelectorAll(".trust-avatar");
  if (avatars.length) {
    gsap.from(avatars, {
      x: -20,
      opacity: 0,
      stagger: 0.08,
      duration: 0.4,
      scrollTrigger: {
        trigger: ctaContentRef.value.querySelector(".cta-trust"),
        start: "top 90%",
        toggleActions: "play none none none",
        once: true,
      },
    });
  }
};

onMounted(() => {
  mobileMql = window.matchMedia("(max-width: 768px)");
  updateIsMobile();
  mobileMql.addEventListener("change", updateIsMobile);

  // Delay to ensure DOM is ready
  setTimeout(() => {
    // Sur mobile, on ne lance aucune animation d'entrée/scroll : le
    // contenu doit être visible immédiatement. Seules les animations
    // CSS de fond et du mockup BLOOP Studio restent actives (voir <style>).
    if (!isMobile.value) {
      initHeroAnimations();
      initFeaturesAnimations();
      initStepsAnimations();
      initPricingAnimations();
      initCtaAnimations();
    }

    requestAnimationFrame(() => ScrollTrigger.refresh());
  }, 100);

  window.addEventListener("load", refreshScrollTrigger);
  window.addEventListener("orientationchange", refreshScrollTrigger);
});

const refreshScrollTrigger = () => {
  ScrollTrigger.refresh();
};

onUnmounted(() => {
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  window.removeEventListener("load", refreshScrollTrigger);
  window.removeEventListener("orientationchange", refreshScrollTrigger);
  mobileMql?.removeEventListener("change", updateIsMobile);
});
</script>

<style scoped>
/* Base styles */
.landing-main {
  padding-bottom: 2rem;
  position: relative;
  overflow-x: hidden;
  overflow-y: visible;
  color: var(--color-white);
  display: flex;
  flex-direction: column;
  gap: 8rem;
}

.landing-main > section {
  perspective: 1000px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.landing-main .hero {
  min-height: 100vh;
}

.section-container {
  margin: 0 auto;
  padding: 0 2rem;
  max-width: 1200px;
  width: 100%;
}

/* ==================== HERO SECTION ==================== */
.hero-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  justify-content: center;
}

/* Hero Content */
.hero-content {
  transform-style: preserve-3d;
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.8);
  }
}

.hero-title {
  font-size: clamp(2.5rem, 5vw, 4rem);
  line-height: 1.1;
  margin-bottom: 1.5rem;
  color: var(--color-white);
}

.title-line {
  display: block;
}

.title-line.highlight {
  position: relative;
  display: inline-block;
}

.gradient-text {
  background: linear-gradient(
    135deg,
    var(--color-accent) 0%,
    var(--color-secondary) 50%,
    var(--color-accent) 100%
  );
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-shift 5s ease infinite;
}

@keyframes gradient-shift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.hero-description {
  font-size: 1.125rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 2rem;
  max-width: 500px;
}

/* Hero Stats */
.hero-stats {
  display: flex;
  gap: 2.5rem;
  margin-bottom: 2.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-accent);
}

.stat-label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Hero Actions */
.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

/* Hero Visual */
.hero-visual {
  position: relative;
  transform-style: preserve-3d;
}

@keyframes pulse-glow {
  0%,
  100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

.studio-mockup {
  position: relative;
  background: linear-gradient(
    145deg,
    rgba(15, 23, 42, 0.9) 0%,
    rgba(var(--color-landing-bg-rgb), 0.95) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  transform-style: preserve-3d;
  will-change: transform;
}

.mockup-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.mockup-dots {
  display: flex;
  gap: 6px;
}

.mockup-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

/* stylelint-disable color-no-hex -- pastilles macOS (rouge/jaune/vert) du mockup illustratif, couleurs figées non liées à la charte */
.mockup-dots span:nth-child(1) {
  background: #ff5f57;
}
.mockup-dots span:nth-child(2) {
  background: #febc2e;
}
.mockup-dots span:nth-child(3) {
  background: #28c840;
}
/* stylelint-enable color-no-hex */

.mockup-title {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
}

.mockup-content {
  padding: 1.5rem;
}

/* Waveform */
.waveform-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  height: 80px;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: var(--radius-md);
}

.wave-bar {
  width: 4px;
  height: 50%;
  background: linear-gradient(
    180deg,
    var(--color-accent) 0%,
    var(--color-accent3) 100%
  );
  border-radius: 2px;
  animation: wave-dance 1.2s ease-in-out infinite;
  animation-delay: calc(var(--i) * 0.05s);
  transform-origin: bottom;
}

@keyframes wave-dance {
  0%,
  100% {
    transform: scaleY(0.3);
  }
  50% {
    transform: scaleY(1);
  }
}

/* Track lanes */
.track-lanes {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.track {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.track-name {
  width: 60px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
}

.track-blocks {
  flex: 1;
  position: relative;
  height: 24px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
}

.track-block {
  position: absolute;
  top: 2px;
  bottom: 2px;
  background: var(--color);
  border-radius: 3px;
  opacity: 0.7;
  animation: block-pulse 3s ease-in-out infinite;
}

@keyframes block-pulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.9;
  }
}

/* Mockup controls */
.mockup-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: var(--radius-md);
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--color-accent);
  border-radius: 50%;
  color: var(--color-black);
}

.timeline {
  flex: 1;
  position: relative;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.timeline-progress {
  position: absolute;
  left: 0;
  top: 0;
  width: 60%;
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--color-accent),
    var(--color-secondary)
  );
  border-radius: 2px;
  animation: progress-move 8s linear infinite;
}

@keyframes progress-move {
  0% {
    width: 0%;
  }
  100% {
    width: 100%;
  }
}

.timeline-head {
  position: absolute;
  left: 60%;
  top: 50%;
  width: 12px;
  height: 12px;
  background: var(--color-accent);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 10px var(--color-accent);
  animation: head-move 8s linear infinite;
}

@keyframes head-move {
  0% {
    left: 0%;
  }
  100% {
    left: 100%;
  }
}

.time-display {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  font-variant-numeric: tabular-nums;
}

/* ==================== SECTION STYLES ==================== */
.section-header {
  text-align: center;
  margin-bottom: 4rem;
}

.section-title {
  font-size: clamp(2rem, 4vw, 3rem);
  color: var(--color-white);
  margin-bottom: 1rem;
}

.section-subtitle {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.6);
  max-width: 600px;
  margin: 0 auto;
}

/* ==================== FEATURES SECTION ==================== */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
  perspective: 1000px;
}

.feature-card {
  position: relative;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transform-style: preserve-3d;
  will-change: transform;
  transition: border-color 0.3s ease;
}

.feature-card:hover {
  border-color: rgba(255, 255, 255, 0.1);
}

.feature-morph {
  position: absolute;
  top: 1rem;
  right: 1rem;
  opacity: 0.3;
}

.feature-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.feature-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
  margin-bottom: 1.5rem;
  color: var(--color);
  font-size: 1.25rem;
  transition: all 0.3s ease;
  will-change: transform;
}

.feature-title {
  font-size: 1.25rem;
  color: var(--color-white);
  margin-bottom: 0.75rem;
}

.feature-description {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
}

/* ==================== HOW IT WORKS ==================== */
.steps-container {
  position: relative;
  margin: 0 auto;
  padding-left: 100px;
}

.steps-line-svg {
  position: absolute;
  left: 40px;
  top: 0;
  width: 4px;
  height: 100%;
}

.line-bg {
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 2;
}

.line-progress {
  stroke: url(#lineGradient);
  stroke: var(--color-accent);
  stroke-width: 2;
  stroke-linecap: round;
}

.step-item {
  position: relative;
  display: grid;
  grid-template-columns: 80px 1fr auto;
  gap: 2rem;
  padding: 2rem 0;
  will-change: transform, opacity;
}

.step-number {
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 50%;
  font-size: 1.5rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
  will-change: transform, background-color, color;
}

.step-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.step-title {
  font-size: 1.5rem;
  color: var(--color-white);
}

.step-description {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
}

.step-visual {
  display: flex;
  align-items: center;
}

.step-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-lg);
  color: var(--color-accent);
  font-size: 1.25rem;
}

/* ==================== PRICING SECTION ==================== */
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.pricing-card {
  position: relative;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 24px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  transform-style: preserve-3d;
  will-change: transform;
  transition:
    border-color 0.3s ease,
    box-shadow 0.3s ease;
}

.pricing-card.popular {
  background: linear-gradient(
    145deg,
    rgba(255, 210, 105, 0.1) 0%,
    rgba(255, 210, 105, 0.02) 100%
  );
  border-color: rgba(255, 210, 105, 0.3);
  transform: scale(1.05);
}

.popular-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.5rem 1.5rem;
  background: linear-gradient(
    135deg,
    var(--color-accent) 0%,
    var(--color-accent2) 100%
  );
  border-radius: 50px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-black);
}

.plan-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.plan-header {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plan-name {
  font-size: 1.25rem;
  color: var(--color-white);
}

.plan-price {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.25rem;
}

.currency {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-accent);
}

.amount {
  font-size: 3.5rem;
  font-weight: 700;
  color: var(--color-white);
  line-height: 1;
}

.period {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.5);
}

.plan-separator {
  height: 1px;
  width: 100%;
  background-color: rgba(255, 255, 255, 0.1);
}

.plan-description {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.5);
}

.plan-features {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plan-feature {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.95rem;
}

.plan-feature svg {
  color: var(--color-accent);
  flex-shrink: 0;
}

.plan-btn {
  width: 100%;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: var(--color-white);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.plan-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.plan-btn.primary {
  background: linear-gradient(
    135deg,
    var(--color-accent) 0%,
    var(--color-accent2) 100%
  );
  border: none;
  color: var(--color-black);
}

.plan-btn.primary:hover {
  box-shadow: 0 4px 20px rgba(255, 210, 105, 0.3);
  transform: translateY(-2px);
}

/* ==================== CTA SECTION ==================== */
.cta-content {
  padding: 2rem;
  border-radius: var(--radius-lg);
  background: linear-gradient(
    45deg,
    rgba(145, 165, 249, 0.05) 0,
    rgba(255, 210, 105, 0.08) 100%
  );
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 2rem;
}

.cta-title {
  font-size: clamp(2rem, 4vw, 3rem);
  color: var(--color-white);
  will-change: transform, opacity, filter;
}

.cta-description {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.6);
}

.cta-trust {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
}

.trust-avatars {
  display: flex;
}

.trust-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid var(--color-black);
  margin-left: -10px;
  object-fit: cover;
  background: linear-gradient(
    135deg,
    var(--color-accent) 0%,
    var(--color-secondary) 100%
  );
}

.trust-avatar:first-child {
  margin-left: 0;
}

/* ==================== MCP SECTION ==================== */
.mcp-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 1rem;
  background: rgba(255, 63, 180, 0.1);
  border: 1px solid rgba(255, 63, 180, 0.3);
  border-radius: 50px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-accent2);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 1.5rem;
}

.mcp-badge .badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent2);
  animation: pulse-dot 2s ease-in-out infinite;
}

.mcp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: start;
  margin-top: 3.5rem;
}

.mcp-steps {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.mcp-step {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 1.25rem;
  align-items: start;
}

.mcp-step-number {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  background: rgba(255, 247, 171, 0.08);
  border: 1px solid rgba(255, 247, 171, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-accent);
  flex-shrink: 0;
}

.mcp-step-title {
  font-size: 1rem;
  color: var(--color-white);
  margin: 0 0 0.35rem 0;
  padding-top: 0.7rem;
}

.mcp-step-desc {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.6;
  margin: 0;
}

.mcp-config-card {
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-xl);
  overflow: hidden;
  backdrop-filter: blur(8px);
}

.config-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.25rem;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.config-dots {
  display: flex;
  gap: 5px;
}

.config-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
}

.config-dots span:first-child {
  background: rgba(255, 95, 87, 0.7);
}
.config-dots span:nth-child(2) {
  background: rgba(255, 189, 46, 0.7);
}
.config-dots span:nth-child(3) {
  background: rgba(40, 201, 64, 0.7);
}

.config-filename {
  flex: 1;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
  font-family: "Courier New", monospace;
}

.config-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.75rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.config-copy-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-white);
  border-color: rgba(255, 255, 255, 0.2);
}

/* stylelint-disable color-no-hex -- verts/bleus de statut copié + coloration syntaxique JSON illustrative, non liés à la charte */
.config-copy-btn.copied {
  background: rgba(40, 201, 64, 0.12);
  border-color: rgba(40, 201, 64, 0.3);
  color: #28c940;
}

.config-code {
  margin: 0;
  padding: 1.5rem 1.75rem;
  font-family: "Courier New", Courier, monospace;
  font-size: 0.875rem;
  line-height: 1.8;
  overflow-x: auto;
}

.json-brace {
  color: rgba(255, 255, 255, 0.5);
}
.json-key {
  color: #7dd3fc;
}
.json-colon {
  color: rgba(255, 255, 255, 0.4);
}
.json-string {
  color: #86efac;
}
/* stylelint-enable color-no-hex */
.json-origin {
  color: var(--color-accent);
}
.json-comma {
  color: rgba(255, 255, 255, 0.4);
}

.config-footer {
  padding: 0.875rem 1.75rem;
  font-size: 0.775rem;
  color: rgba(255, 255, 255, 0.35);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  line-height: 1.5;
}

/* ==================== RESPONSIVE ==================== */
@media (max-width: 1024px) {
  .hero-container {
    grid-template-columns: 1fr;
    gap: 3rem;
    text-align: center;
  }

  .hero-content {
    order: 1;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .hero-visual {
    order: 2;
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
    box-sizing: border-box;
  }

  .hero-title {
    width: 100%;
  }

  .hero-description {
    width: 100%;
    max-width: 100%;
    margin-left: auto;
    margin-right: auto;
  }

  .hero-stats {
    width: 100%;
    justify-content: center;
  }

  .hero-actions {
    width: 100%;
    justify-content: center;
  }

  .steps-container {
    padding-left: 80px;
  }

  .step-item {
    grid-template-columns: 60px 1fr;
    gap: 1.5rem;
  }

  .step-visual {
    display: none;
  }

  .steps-line-svg {
    left: 20px;
  }

  .step-number {
    width: 60px;
    height: 60px;
    font-size: 1.25rem;
    background: var(--color-secondary);
    color: var(--color-black);
    box-shadow: 0 0 20px rgba(255, 210, 105, 0.3);
  }
}

@media (max-width: 768px) {
  .hero {
    padding: 6rem 0 3rem 0;
  }

  .hero-title {
    font-size: 2.25rem;
  }

  .hero-stats {
    flex-direction: row;
    gap: 1.5rem;
  }

  .stat-value {
    font-size: 1.5rem;
  }

  .hero-actions {
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .hero-actions > * {
    width: 100%;
    max-width: 320px;
  }

  .hero-actions :deep(button) {
    width: 100%;
  }

  .features,
  .how-it-works,
  .pricing,
  .mcp-docs,
  .cta-section {
    padding: 5rem 0;
  }

  .mcp-grid {
    grid-template-columns: 1fr;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .pricing-grid {
    grid-template-columns: 1fr;
  }

  .pricing-card.popular {
    transform: none;
  }

  .section-container {
    padding: 0 1.5rem;
  }
}

@media (max-width: 480px) {
  .section-title {
    font-size: 1.75rem;
  }

  .steps-container {
    padding-left: 0;
  }

  .step-item {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .steps-line-svg {
    display: none;
  }

  .step-number {
    margin: 0 auto 1rem;
  }

  .cta-trust {
    flex-direction: column;
  }
}

/* Toutes les animations CSS en boucle (fond + BLOOP Studio) restent
   actives sur mobile — seules les animations d'entrée/scroll pilotées
   par GSAP sont désactivées (voir le script : isMobile.value). */

/* Filet de sécurité : sur mobile, on force l'affichage du contenu
   texte/cartes/CTA même si une animation (GSAP ou le composant
   SplitText) l'a laissé en opacity:0 / transform / blur. Le mockup
   "BLOOP Studio" (studio-mockup) et ses animations internes ne sont
   pas concernés, ils continuent d'animer normalement. */
@media (max-width: 768px) {
  .hero-title,
  .hero-title *,
  .hero-description,
  .hero-stats,
  .hero-actions,
  .section-title,
  .section-title *,
  .feature-card,
  .feature-icon,
  .step-item,
  .step-number,
  .pricing-card,
  .cta-title,
  .cta-title *,
  .cta-description,
  .cta-trust,
  .trust-avatar {
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
  }

  /* Le trait qui se dessine dans "Comment ça marche" doit être
     visible d'un coup, pas figé à mi-tracé. */
  .line-progress {
    stroke-dasharray: none !important;
    stroke-dashoffset: 0 !important;
  }
}
</style>
