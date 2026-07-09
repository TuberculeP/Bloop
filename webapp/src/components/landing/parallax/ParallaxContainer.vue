<template>
  <div class="parallax-container" ref="containerRef">
    <div class="parallax-viewport">
      <!-- Layer 0: Stars (slowest) -->
      <div class="parallax-layer layer-0" ref="layer0">
        <!-- <StarfieldLayer :count="150" /> -->
      </div>

      <!-- Layer 1: Gradient Orbs -->
      <div class="parallax-layer layer-1" ref="layer1">
        <div class="gradient-orb orb-1"></div>
        <div class="gradient-orb orb-2"></div>
        <div class="gradient-orb orb-3"></div>
      </div>

      <!-- Layer 2: Floating Elements -->
      <div class="parallax-layer layer-2" ref="layer2">
        <FloatingElements />
      </div>

      <!-- Layer 3: Decorative Shapes -->
      <div class="parallax-layer layer-3" ref="layer3">
        <div class="deco-shape shape-1"></div>
        <div class="deco-shape shape-2"></div>
        <div class="deco-shape shape-3"></div>
      </div>

      <!-- Layer 4: Main Content -->
      <div class="layer-content">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useGsap } from "../../../composables/useGsap";
import { useParallax } from "../../../composables/useParallax";
// import StarfieldLayer from "./StarfieldLayer.vue";
import FloatingElements from "./FloatingElements.vue";

const containerRef = ref<HTMLElement | null>(null);
const layer0 = ref<HTMLElement | null>(null);
const layer1 = ref<HTMLElement | null>(null);
const layer2 = ref<HTMLElement | null>(null);
const layer3 = ref<HTMLElement | null>(null);

const { gsap, ScrollTrigger } = useGsap();
const { addMouseParallax } = useParallax(containerRef);

onMounted(() => {
  if (layer0.value) {
    gsap.to(layer0.value, {
      y: () => ScrollTrigger.maxScroll(window) * 0.1,
      ease: "none",
      scrollTrigger: {
        start: "top top",
        end: "bottom bottom",
        scrub: 0.3,
      },
    });
  }

  if (layer1.value) {
    gsap.to(layer1.value, {
      y: () => ScrollTrigger.maxScroll(window) * 0.2,
      ease: "none",
      scrollTrigger: {
        start: "top top",
        end: "bottom bottom",
        scrub: 0.5,
      },
    });
    addMouseParallax(layer1.value, 0.02);
  }

  if (layer2.value) {
    gsap.to(layer2.value, {
      y: () => ScrollTrigger.maxScroll(window) * 0.35,
      ease: "none",
      scrollTrigger: {
        start: "top top",
        end: "bottom bottom",
        scrub: 0.7,
      },
    });
    addMouseParallax(layer2.value, 0.03);
  }

  if (layer3.value) {
    gsap.to(layer3.value, {
      y: () => ScrollTrigger.maxScroll(window) * 0.5,
      ease: "none",
      scrollTrigger: {
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
      },
    });
    addMouseParallax(layer3.value, 0.04);
  }
});
</script>

<style scoped>
.parallax-container {
  position: relative;
  width: 100%;
  min-height: 100vh;
  overflow: visible;
  background: linear-gradient(
    180deg,
    var(--color-bg-primary-dark) 0%,
    var(--color-bg-secondary-dark) 50%,
    var(--color-primary-active) 100%
  );
}

.parallax-viewport {
  position: relative;
  width: 100%;
  transform-style: preserve-3d;
  perspective: 1000px;
}

.parallax-layer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  pointer-events: none;
  will-change: transform;
}

.layer-0 {
  z-index: 0;
}

.layer-1 {
  z-index: 1;
}

.layer-2 {
  z-index: 2;
}

.layer-3 {
  z-index: 3;
}

.layer-content {
  position: relative;
  z-index: 10;
  pointer-events: auto;
  min-height: 100vh;
}

/* Gradient Orbs */
.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  animation: float-orb 20s ease-in-out infinite;
}

.orb-1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(
    circle,
    rgba(255, 210, 105, 0.4) 0%,
    transparent 70%
  );
  top: 5%;
  right: -10%;
  animation-delay: 0s;
}

.orb-2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(
    circle,
    rgba(145, 165, 249, 0.4) 0%,
    transparent 70%
  );
  bottom: 20%;
  left: -10%;
  animation-delay: -7s;
}

.orb-3 {
  width: 400px;
  height: 400px;
  background: radial-gradient(
    circle,
    rgba(124, 200, 245, 0.3) 0%,
    transparent 70%
  );
  top: 40%;
  left: 30%;
  animation-delay: -14s;
}

@keyframes float-orb {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(30px, -30px) scale(1.05);
  }
  50% {
    transform: translate(-20px, 20px) scale(0.95);
  }
  75% {
    transform: translate(20px, 10px) scale(1.02);
  }
}

/* Decorative Shapes */
.deco-shape {
  position: absolute;
  border: 1px solid rgba(255, 210, 105, 0.15);
  animation: rotate-shape 30s linear infinite;
}

.shape-1 {
  width: 300px;
  height: 300px;
  border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
  top: 15%;
  left: 10%;
  animation-duration: 25s;
}

.shape-2 {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  bottom: 30%;
  right: 15%;
  animation-duration: 35s;
  animation-direction: reverse;
}

.shape-3 {
  width: 150px;
  height: 150px;
  border-radius: 20%;
  top: 60%;
  left: 60%;
  animation-duration: 40s;
}

@keyframes rotate-shape {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .parallax-layer {
    position: absolute;
  }

  .gradient-orb {
    filter: blur(60px);
    opacity: 0.3;
  }

  .orb-1 {
    width: 300px;
    height: 300px;
  }

  .orb-2 {
    width: 250px;
    height: 250px;
  }

  .orb-3 {
    width: 200px;
    height: 200px;
  }

  .deco-shape {
    display: none;
  }
}
</style>
