<template>
  <div class="starfield" ref="starfieldRef">
    <div
      v-for="star in stars"
      :key="star.id"
      class="star"
      :style="{
        left: star.x + '%',
        top: star.y + '%',
        width: star.size + 'px',
        height: star.size + 'px',
        animationDelay: star.delay + 's',
        animationDuration: star.duration + 's',
        opacity: star.opacity,
      }"
    ></div>
    <div
      v-for="shootingStar in shootingStars"
      :key="'shoot-' + shootingStar.id"
      class="shooting-star"
      :style="{
        left: shootingStar.x + '%',
        top: shootingStar.y + '%',
        animationDelay: shootingStar.delay + 's',
      }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import gsap from "gsap";

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
}

interface ShootingStar {
  id: number;
  x: number;
  y: number;
  delay: number;
}

const props = withDefaults(
  defineProps<{
    count?: number;
  }>(),
  {
    count: 100,
  },
);

const starfieldRef = ref<HTMLElement | null>(null);

const stars = computed<Star[]>(() => {
  return Array.from({ length: props.count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    delay: Math.random() * 5,
    duration: Math.random() * 3 + 2,
    opacity: Math.random() * 0.5 + 0.3,
  }));
});

const shootingStars = computed<ShootingStar[]>(() => {
  return Array.from({ length: 5 }, (_, i) => ({
    id: i,
    x: Math.random() * 80 + 10,
    y: Math.random() * 30,
    delay: Math.random() * 15 + i * 8,
  }));
});

onMounted(() => {
  if (starfieldRef.value) {
    const starElements = starfieldRef.value.querySelectorAll(".star");

    starElements.forEach((star, index) => {
      gsap.to(star, {
        y: `+=${Math.random() * 50 + 20}`,
        duration: stars.value[index]?.duration || 3,
        ease: "none",
        repeat: -1,
        yoyo: true,
        delay: stars.value[index]?.delay || 0,
      });
    });
  }
});
</script>

<style scoped>
.starfield {
  position: absolute;
  width: 100%;
  height: 200%;
  top: 0;
  left: 0;
  overflow: hidden;
}

.star {
  position: absolute;
  /* stylelint-disable-next-line color-no-hex -- blanc pur pour les particules d'étoiles */
  background: #fff;
  border-radius: 50%;
  animation: twinkle 3s ease-in-out infinite;
  box-shadow: 0 0 6px 2px rgba(255, 255, 255, 0.3);
}

@keyframes twinkle {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

.shooting-star {
  position: absolute;
  width: 4px;
  height: 4px;
  /* stylelint-disable-next-line color-no-hex -- blanc pur pour la traînée d'étoile filante */
  background: linear-gradient(90deg, #fff, transparent);
  border-radius: 50%;
  animation: shoot 3s ease-out infinite;
  opacity: 0;
}

.shooting-star::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  width: 100px;
  height: 1px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.8), transparent);
}

@keyframes shoot {
  0% {
    opacity: 0;
    transform: translate(0, 0) rotate(-45deg);
  }
  10% {
    opacity: 1;
  }
  70% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(300px, 300px) rotate(-45deg);
  }
}

/* Performance optimization for mobile */
@media (max-width: 768px) {
  .shooting-star {
    display: none;
  }
}
</style>
