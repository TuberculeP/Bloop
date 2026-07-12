<template>
  <div class="floating-elements" ref="containerRef">
    <!-- Musical Notes -->
    <div
      v-for="note in musicalNotes"
      :key="'note-' + note.id"
      class="floating-note"
      :style="{
        left: note.x + '%',
        top: note.y + '%',
        fontSize: note.size + 'px',
        animationDelay: note.delay + 's',
        animationDuration: note.duration + 's',
      }"
    >
      {{ note.symbol }}
    </div>

    <!-- Geometric shapes -->
    <div
      v-for="shape in geometricShapes"
      :key="'shape-' + shape.id"
      class="floating-shape"
      :class="shape.type"
      :style="{
        left: shape.x + '%',
        top: shape.y + '%',
        width: shape.size + 'px',
        height: shape.size + 'px',
        animationDelay: shape.delay + 's',
        animationDuration: shape.duration + 's',
        borderColor: shape.color,
      }"
    ></div>

    <!-- Glowing dots -->
    <div
      v-for="dot in glowingDots"
      :key="'dot-' + dot.id"
      class="glowing-dot"
      :style="{
        left: dot.x + '%',
        top: dot.y + '%',
        width: dot.size + 'px',
        height: dot.size + 'px',
        animationDelay: dot.delay + 's',
        backgroundColor: dot.color,
        boxShadow: `0 0 ${dot.size * 2}px ${dot.color}`,
      }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import gsap from "gsap";

interface MusicalNote {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  symbol: string;
}

interface GeometricShape {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  type: "circle" | "square" | "triangle";
  color: string;
}

interface GlowingDot {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  color: string;
}

const containerRef = ref<HTMLElement | null>(null);

const noteSymbols = ["♪", "♫", "♬", "♩", "𝄞"];
const colors = [
  "rgba(255, 210, 105, 0.5)",
  "rgba(145, 165, 249, 0.5)",
  "rgba(124, 200, 245, 0.5)",
  "rgba(96, 189, 97, 0.5)",
];

const musicalNotes = computed<MusicalNote[]>(() => {
  return Array.from({ length: 15 }, (_, i) => ({
    id: i,
    x: Math.random() * 90 + 5,
    y: Math.random() * 150 + 10,
    size: Math.random() * 20 + 16,
    delay: Math.random() * 10,
    duration: Math.random() * 10 + 15,
    symbol: noteSymbols[Math.floor(Math.random() * noteSymbols.length)],
  }));
});

const geometricShapes = computed<GeometricShape[]>(() => {
  const types: ("circle" | "square" | "triangle")[] = [
    "circle",
    "square",
    "triangle",
  ];
  return Array.from({ length: 8 }, (_, i) => ({
    id: i,
    x: Math.random() * 90 + 5,
    y: Math.random() * 150 + 10,
    size: Math.random() * 30 + 20,
    delay: Math.random() * 8,
    duration: Math.random() * 15 + 20,
    type: types[Math.floor(Math.random() * types.length)],
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
});

const glowingDots = computed<GlowingDot[]>(() => {
  return Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: Math.random() * 95 + 2.5,
    y: Math.random() * 150 + 10,
    size: Math.random() * 6 + 4,
    delay: Math.random() * 5,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
});

onMounted(() => {
  if (containerRef.value) {
    const notes = containerRef.value.querySelectorAll(".floating-note");
    const shapes = containerRef.value.querySelectorAll(".floating-shape");
    const dots = containerRef.value.querySelectorAll(".glowing-dot");

    notes.forEach((note, index) => {
      gsap.to(note, {
        y: "-=100",
        x: `+=${(Math.random() - 0.5) * 50}`,
        rotation: Math.random() * 360,
        duration: musicalNotes.value[index]?.duration || 15,
        ease: "none",
        repeat: -1,
        delay: musicalNotes.value[index]?.delay || 0,
      });
    });

    shapes.forEach((shape, index) => {
      gsap.to(shape, {
        y: "-=80",
        rotation: 360,
        duration: geometricShapes.value[index]?.duration || 20,
        ease: "none",
        repeat: -1,
        delay: geometricShapes.value[index]?.delay || 0,
      });
    });

    dots.forEach((dot, index) => {
      gsap.to(dot, {
        y: "-=60",
        scale: 1.5,
        duration: 8,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: glowingDots.value[index]?.delay || 0,
      });
    });
  }
});
</script>

<style scoped>
.floating-elements {
  position: absolute;
  width: 100%;
  height: 200%;
  top: 0;
  left: 0;
  overflow: hidden;
}

/* Musical Notes */
.floating-note {
  position: absolute;
  color: rgba(255, 210, 105, 0.4);
  font-family: serif;
  animation: float-note 15s ease-in-out infinite;
  text-shadow: 0 0 10px currentColor;
  opacity: 0.6;
}

@keyframes float-note {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
    opacity: 0.6;
  }
  25% {
    opacity: 0.8;
  }
  50% {
    transform: translateY(-50px) rotate(15deg);
    opacity: 0.4;
  }
  75% {
    opacity: 0.7;
  }
}

/* Geometric Shapes */
.floating-shape {
  position: absolute;
  border: 1px solid;
  opacity: 0.3;
  animation: rotate-float 20s linear infinite;
}

.floating-shape.circle {
  border-radius: 50%;
}

.floating-shape.square {
  border-radius: var(--radius-sm);
}

.floating-shape.triangle {
  border: none;
  /* stylelint-disable declaration-no-important -- nécessaire : chaque forme reçoit une largeur/hauteur inline (:style) aléatoire, le triangle doit forcer 0 pour se dessiner via les bordures */
  width: 0 !important;
  height: 0 !important;
  /* stylelint-enable declaration-no-important */
  border-left: 15px solid transparent;
  border-right: 15px solid transparent;
  border-bottom: 26px solid rgba(255, 210, 105, 0.3);
}

@keyframes rotate-float {
  0% {
    transform: translateY(0) rotate(0deg);
  }
  100% {
    transform: translateY(-100px) rotate(360deg);
  }
}

/* Glowing Dots */
.glowing-dot {
  position: absolute;
  border-radius: 50%;
  animation: pulse-glow 3s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.3);
  }
}

/* Mobile optimization */
@media (max-width: 768px) {
  .floating-note:nth-child(n + 8) {
    display: none;
  }

  .floating-shape:nth-child(n + 5) {
    display: none;
  }

  .glowing-dot:nth-child(n + 7) {
    display: none;
  }
}
</style>
