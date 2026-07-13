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
              animation-type="rotate3d"
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
            <LandingCtaButton to="/app">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              <span>Commencer gratuitement</span>
            </LandingCtaButton>
            <button class="btn-cta secondary" @click="scrollToFeatures">
              <span class="btn-content">
                <span>Découvrir</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <polyline points="19 12 12 19 5 12"></polyline>
                </svg>
              </span>
            </button>
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
            v-for="(feature, idx) in features"
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
              <component :is="feature.icon" />
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
            v-for="(step, index) in steps"
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
                <component :is="step.icon" />
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
            v-for="(plan, idx) in plans"
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
            <div v-for="(step, i) in mcpSteps" :key="i" class="mcp-step">
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
            <span
              >+<CountUp :target="20000" :separator="' '" /> créateurs nous font
              confiance</span
            >
          </div>
          <div class="cta-actions">
            <LandingCtaButton to="/app">
              <span>Lancer le studio</span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </LandingCtaButton>
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
  h,
  inject,
  type ComponentPublicInstance,
} from "vue";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import LandingIncluded from "./LandingIncluded.vue";
import LandingCtaButton from "./LandingCtaButton.vue";
import SplitText from "./effects/SplitText.vue";
import CountUp from "./effects/CountUp.vue";
import MorphShape from "./effects/MorphShape.vue";

gsap.registerPlugin(ScrollTrigger);

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
const ctaParticlesRef = ref<HTMLElement | null>(null);

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

// Icons
const WaveformIcon = () =>
  h(
    "svg",
    {
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2,
    },
    [h("path", { d: "M2 12h2l2-7 3 14 3-10 2 6 2-3h6" })],
  );

const CloudIcon = () =>
  h(
    "svg",
    {
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2,
    },
    [h("path", { d: "M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" })],
  );

const LayoutIcon = () =>
  h(
    "svg",
    {
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2,
    },
    [
      h("rect", { x: 3, y: 3, width: 18, height: 18, rx: 2, ry: 2 }),
      h("line", { x1: 3, y1: 9, x2: 21, y2: 9 }),
      h("line", { x1: 9, y1: 21, x2: 9, y2: 9 }),
    ],
  );

const UsersIcon = () =>
  h(
    "svg",
    {
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2,
    },
    [
      h("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
      h("circle", { cx: 9, cy: 7, r: 4 }),
      h("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }),
      h("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" }),
    ],
  );

const MicIcon = () =>
  h(
    "svg",
    {
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2,
    },
    [
      h("path", { d: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" }),
      h("path", { d: "M19 10v2a7 7 0 0 1-14 0v-2" }),
      h("line", { x1: 12, y1: 19, x2: 12, y2: 23 }),
      h("line", { x1: 8, y1: 23, x2: 16, y2: 23 }),
    ],
  );

const InfinityIcon = () =>
  h(
    "svg",
    {
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2,
    },
    [
      h("path", {
        d: "M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z",
      }),
    ],
  );

const UserPlusIcon = () =>
  h(
    "svg",
    {
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2,
    },
    [
      h("path", { d: "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
      h("circle", { cx: 8.5, cy: 7, r: 4 }),
      h("line", { x1: 20, y1: 8, x2: 20, y2: 14 }),
      h("line", { x1: 23, y1: 11, x2: 17, y2: 11 }),
    ],
  );

const SlidersIcon = () =>
  h(
    "svg",
    {
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2,
    },
    [
      h("line", { x1: 4, y1: 21, x2: 4, y2: 14 }),
      h("line", { x1: 4, y1: 10, x2: 4, y2: 3 }),
      h("line", { x1: 12, y1: 21, x2: 12, y2: 12 }),
      h("line", { x1: 12, y1: 8, x2: 12, y2: 3 }),
      h("line", { x1: 20, y1: 21, x2: 20, y2: 16 }),
      h("line", { x1: 20, y1: 12, x2: 20, y2: 3 }),
      h("line", { x1: 1, y1: 14, x2: 7, y2: 14 }),
      h("line", { x1: 9, y1: 8, x2: 15, y2: 8 }),
      h("line", { x1: 17, y1: 16, x2: 23, y2: 16 }),
    ],
  );

const RocketIcon = () =>
  h(
    "svg",
    {
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2,
    },
    [
      h("path", {
        d: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z",
      }),
      h("path", {
        d: "M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z",
      }),
      h("path", { d: "M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" }),
      h("path", { d: "M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" }),
    ],
  );

const features = [
  {
    icon: WaveformIcon,
    title: "Audio professionnel",
    description:
      "Qualité studio avec notre moteur audio haute fidélité et nos effets professionnels.",
    color: "#ffd269",
  },
  {
    icon: CloudIcon,
    title: "100% Cloud",
    description:
      "Vos projets sauvegardés automatiquement, accessibles depuis n'importe où.",
    color: "#91a5f9",
  },
  {
    icon: LayoutIcon,
    title: "Interface intuitive",
    description:
      "Une expérience utilisateur pensee pour la créativité, pas la complexite.",
    color: "#7cc8f5",
  },
  {
    icon: UsersIcon,
    title: "Collaboration live",
    description:
      "Créez ensemble en temps réel, ou que vous soyez dans le monde.",
    color: "#60bd61",
  },
  {
    icon: MicIcon,
    title: "Multi-pistes",
    description:
      "Enregistrez et mixez autant de pistes que votre créativité l'exige.",
    color: "#f59e0b",
  },
  {
    icon: InfinityIcon,
    title: "Sans limites",
    description:
      "Pistes, presets et exports illimites pour une création sans frontieres.",
    color: "#ec4899",
  },
];

const steps = [
  {
    icon: UserPlusIcon,
    title: "Créez votre compte",
    description:
      "Inscription gratuite en quelques secondes. Commencez à créer immediatement.",
  },
  {
    icon: SlidersIcon,
    title: "Configurez votre studio",
    description:
      "Choisissez vos instruments, effets et configurez votre espace de travail ideal.",
  },
  {
    icon: RocketIcon,
    title: "Lancez-vous !",
    description:
      "Créez, collaborez et partagez vos créations avec le monde entier.",
  },
];

const plans = [
  {
    name: "Freemium",
    price: "0",
    description: "Pour decouvrir BLOOP",
    popular: false,
    features: [
      "Accès à l’espace MAO limité",
      "Plus de 20 000 boucles",
      "Plus de 500 instruments et sons",
      "Espace communautaire",
    ],
    cta: "Commencer gratuitement",
  },
  {
    name: "Medium",
    price: "9.99",
    description: "Pour les créateurs sérieux",
    popular: true,
    features: [
      "Accès illimité à l’espace MAO",
      "Plus de 30 000 boucles",
      "Partage et collaboration",
      "Espace communautaire enrichi",
      "Support prioritaire",
    ],
    cta: "Essai gratuit 14 jours",
  },
  {
    name: "Premium",
    price: "14.99",
    description: "Pour les professionnels",
    popular: false,
    features: [
      "Accès illimité à l’espace MAO",
      "Collaboration avancée",
      "Real-time vocal tuning et + de 40 effets",
      "Espace communautaire premium",
      "Diffusion de podcast sur Spotify",
    ],
    cta: "Souscrire à l'offre",
  },
];

const currentOrigin = computed(() =>
  typeof window !== "undefined"
    ? window.location.origin
    : "https://bloop-on.cloud",
);

const configCopied = ref(false);

const mcpSteps = [
  {
    title: "Installez Claude Code",
    description:
      "Téléchargez l'extension Claude Code pour VS Code ou utilisez la CLI.",
  },
  {
    title: "Ajoutez la configuration",
    description:
      "Copiez le fichier .mcp.json ci-contre à la racine de votre projet et rechargez Claude Code.",
  },
  {
    title: "Connectez-vous à BLOOP",
    description:
      "Claude Code ouvre votre navigateur — connectez-vous à votre compte BLOOP pour autoriser l'accès.",
  },
  {
    title: "Créez de la musique",
    description:
      "Demandez à Claude de composer, arranger, ajouter des pistes… il agit directement sur vos projets.",
  },
];

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
    tl.to(heroBadgeRef.value, { opacity: 1, y: 0, duration: 0.6 }, 0.3);
  }

  // Description
  if (heroDescRef.value) {
    tl.to(heroDescRef.value, { opacity: 1, y: 0, duration: 0.6 }, 0.8);
  }

  // Stats
  if (heroStatsRef.value) {
    tl.to(heroStatsRef.value, { opacity: 1, y: 0, duration: 0.6 }, 1);
  }

  // Actions
  if (heroActionsRef.value) {
    tl.to(heroActionsRef.value, { opacity: 1, y: 0, duration: 0.6 }, 1.2);
  }

  // Visual with 3D rotation
  if (heroVisualRef.value) {
    tl.to(
      heroVisualRef.value,
      {
        opacity: 1,
        x: 0,
        rotateY: 0,
        duration: 1.2,
        ease: "power2.out",
      },
      0.5,
    );
  }

  // Mockup 3D rotation on scroll
  if (mockupRef.value && heroRef.value) {
    gsap.to(mockupRef.value, {
      rotateY: 15,
      rotateX: -5,
      scale: 0.95,
      scrollTrigger: {
        trigger: heroRef.value,
        start: "top top",
        end: "bottom top",
        scrub: 1,
      },
    });
  }
};

const initFeaturesAnimations = () => {
  if (!featuresGridRef.value) return;

  featureCardRefs.value.forEach((card) => {
    if (!card) return;

    gsap.from(card, {
      y: 80,
      opacity: 0,
      scale: 0.9,
      borderRadius: "50%",
      scrollTrigger: {
        trigger: card,
        start: "top 85%",
        end: "top 50%",
        scrub: 1,
      },
    });

    // Icon rotation on scroll
    const icon = card.querySelector(".feature-icon");
    if (icon) {
      gsap.to(icon, {
        rotation: 360,
        scale: 1.1,
        scrollTrigger: {
          trigger: card,
          start: "top 80%",
          end: "top 30%",
          scrub: 2,
        },
      });
    }
  });
};

const initStepsAnimations = () => {
  if (!stepsContainerRef.value || !lineProgressRef.value) return;

  // Self-drawing line
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
      scrub: 1,
    },
  });

  // Step items animation
  const stepItems = stepsContainerRef.value.querySelectorAll(".step-item");
  stepItems.forEach((step, idx) => {
    const stepNumber = step.querySelector(".step-number");

    gsap.from(step, {
      opacity: 0,
      x: idx % 2 === 0 ? -50 : 50,
      scrollTrigger: {
        trigger: step,
        start: "top 80%",
        end: "top 50%",
        scrub: 1,
      },
    });

    // Step number activation
    gsap.to(stepNumber, {
      backgroundColor: "var(--color-secondary)",
      color: "var(--color-black)",
      scale: 1.1,
      boxShadow: "0 0 20px rgba(255, 210, 105, 0.3)",
      scrollTrigger: {
        trigger: step,
        start: "top 60%",
        end: "top 40%",
        scrub: 1,
      },
    });
  });
};

const initPricingAnimations = () => {
  if (!pricingGridRef.value) return;

  pricingCardRefs.value.forEach((card) => {
    if (!card) return;

    // Cards emerge from depth
    gsap.from(card, {
      z: -300,
      opacity: 0,
      rotateY: 30,
      scale: 0.8,
      scrollTrigger: {
        trigger: card,
        start: "top 85%",
        end: "top 50%",
        scrub: 1,
      },
    });
  });
};

const initCtaAnimations = () => {
  if (!ctaContentRef.value || !ctaParticlesRef.value) return;

  // CTA content dramatic reveal
  gsap.from(ctaContentRef.value.querySelector(".cta-title"), {
    scale: 2,
    opacity: 0,
    filter: "blur(20px)",
    scrollTrigger: {
      trigger: ctaRef.value,
      start: "top 70%",
      end: "top 30%",
      scrub: 1,
    },
  });

  gsap.from(ctaContentRef.value.querySelector(".cta-description"), {
    y: 50,
    opacity: 0,
    scrollTrigger: {
      trigger: ctaRef.value,
      start: "top 60%",
      end: "top 30%",
      scrub: 1,
    },
  });

  // Trust avatars stagger
  const avatars = ctaContentRef.value.querySelectorAll(".trust-avatar");
  gsap.from(avatars, {
    x: -30,
    opacity: 0,
    stagger: 0.1,
    scrollTrigger: {
      trigger: ctaContentRef.value.querySelector(".cta-trust"),
      start: "top 80%",
    },
  });
};

onMounted(() => {
  // Delay to ensure DOM is ready
  setTimeout(() => {
    initHeroAnimations();
    initFeaturesAnimations();
    initStepsAnimations();
    initPricingAnimations();
    initCtaAnimations();
  }, 100);
});

onUnmounted(() => {
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
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
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
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
  font-weight: 700;
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

.btn-cta {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition: all 0.3s ease;
  overflow: hidden;
  border: none;
  cursor: pointer;
}

.btn-cta.secondary {
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-white);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-cta.secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.btn-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  font-weight: 700;
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
  transition: all 0.3s ease;
  will-change: transform;
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 600;
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
  font-weight: 600;
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
  font-weight: 600;
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
  font-weight: 700;
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
  font-weight: 700;
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
  }

  .hero-visual {
    order: 2;
    max-width: 500px;
    margin: 0 auto;
  }

  .hero-description {
    max-width: 100%;
  }

  .hero-stats {
    justify-content: center;
  }

  .hero-actions {
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
  }

  .btn-cta,
  :deep(.landing-cta-button) {
    width: 100%;
    max-width: 300px;
    justify-content: center;
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
</style>
