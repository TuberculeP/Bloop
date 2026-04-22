<script setup lang="ts">
import { ref, onMounted, provide } from "vue";
import { useGsap } from "../composables/useGsap";
import ParallaxContainer from "../components/landing/parallax/ParallaxContainer.vue";

const isLoaded = ref(false);

const scrollTo = (target: string | number | HTMLElement) => {
  const el =
    typeof target === "string" ? document.querySelector(target) : target;
  if (el instanceof HTMLElement) {
    el.scrollIntoView({ behavior: "smooth" });
  }
};
const { gsap } = useGsap();

provide("scrollTo", scrollTo);

onMounted(() => {
  setTimeout(() => {
    isLoaded.value = true;
  }, 100);

  gsap.to(".landing-layout", {
    scrollTrigger: {
      start: "top top",
      end: "bottom bottom",
      scrub: true,
    },
  });
});
</script>

<template>
  <div class="landing-layout" :class="{ loaded: isLoaded }">
    <!-- Parallax background with all layers -->
    <ParallaxContainer>
      <!-- Page content -->
      <div class="layout-content">
        <slot />
      </div>
    </ParallaxContainer>
  </div>
</template>

<style scoped>
.landing-layout {
  position: relative;
  min-height: 100vh;
  font-family:
    var(--font-body),
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  color: var(--color-white);
  overflow: visible;
  background: #060b17;
}

/* Content wrapper */
.layout-content {
  position: relative;
  z-index: 10;
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity 0.8s ease,
    transform 0.8s ease;
}

.landing-layout.loaded .layout-content {
  opacity: 1;
  transform: translateY(0);
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(6, 11, 23, 0.5);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 210, 105, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 210, 105, 0.5);
}

/* Selection styling */
::selection {
  background: rgba(255, 210, 105, 0.3);
  color: var(--color-white);
}
</style>
