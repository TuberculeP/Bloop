<template>
  <button
    :class="[
      'base-button',
      `base-button--${variant}`,
      `base-button--${size}`,
      `base-button--${color}`,
      {
        'base-button--disabled': disabled,
        'base-button--loading': loading,
        'base-button--icon-only': isIconOnly,
      },
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="base-button__spinner">⟳</span>
    <i v-if="leftIcon" :class="leftIcon" />
    <span v-if="label">{{ label }}</span>
    <i v-if="rightIcon" :class="rightIcon" />
    <slot v-else />
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

export interface ButtonProps {
  variant?:
    | "contain"
    | "round"
    | "square"
    | "primary"
    | "secondary"
    | "accent"
    | "accent2"
    | "error"
    | "link"
    | "ghost"
    | "lightghost"
    | "lightlink"
    | "outline"
    | "danger"
    | "success";
  color?:
    | "primary"
    | "secondary"
    | "accent"
    | "accent2"
    | "success"
    | "error"
    | "gradient"
    | "white";
  size?: "small" | "normal" | "large";
  disabled?: boolean;
  loading?: boolean;
  rightIcon?: string;
  leftIcon?: string;
  label?: string;
}

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: "contain",
  color: "primary",
  size: "normal",
  disabled: false,
  loading: false,
});

const isIconOnly = computed(() => !props.label);

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const handleClick = (event: MouseEvent) => {
  emit("click", event);
};
</script>

<style scoped>
/* Le bouton lit toujours ses couleurs via ces variables — c'est la seule
   chose que les classes de couleur plus bas ont à définir. Pas de forme
   explicite (contain/round/...) ? Ce style "rempli" s'applique déjà par
   défaut, donc les anciens appels variant=couleur (sans forme) marchent
   sans rien dupliquer. */
.base-button {
  background: var(--btn-bg);
  color: var(--btn-color);
  border: 1px solid var(--btn-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-decoration: none;
  outline: none;
  box-sizing: border-box;
}

.base-button:hover:not(:disabled) {
  background: var(--btn-bg-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--btn-border) 30%, transparent);
}

/* Sizes */
.base-button--small {
  padding: 6px 12px;
  font-size: 0.8rem;
  min-height: 28px;
}
.base-button--normal {
  padding: 8px 16px;
  font-size: 0.9rem;
  min-height: 36px;
}
.base-button--large {
  padding: 12px 24px;
  font-size: 1rem;
  min-height: 44px;
}

/* Icône sans label = carré */
.base-button--icon-only {
  padding: 0;
}
.base-button--icon-only.base-button--small {
  width: 28px;
  height: 28px;
}
.base-button--icon-only.base-button--normal {
  width: 36px;
  height: 36px;
}
.base-button--icon-only.base-button--large {
  width: 44px;
  height: 44px;
}

/* Palettes — chaque couleur ne fait plus que définir ses variables :
   --btn-bg/--btn-bg-hover : fond au repos / au survol
   --btn-color              : texte quand le fond est plein
   --btn-border              : bordure, et couleur de base pour outline/link
   --btn-bg-pale             : fond pastel utilisé par "outline"
   --btn-outline-text        : texte utilisé par "outline" (plus foncé que
                               --btn-color, pour rester lisible sur un fond pâle) */
.base-button--primary {
  --btn-bg: var(--color-primary-hover);
  --btn-bg-hover: var(--color-primary);
  --btn-color: var(--color-white);
  --btn-border: var(--color-primary-hover);
  --btn-bg-pale: var(--color-primary-pale);
  --btn-outline-text: var(--color-primary-active);
}
.base-button--secondary {
  --btn-bg: var(--color-secondary-hover);
  --btn-bg-hover: var(--color-secondary);
  --btn-color: var(--color-black);
  --btn-border: var(--color-secondary-hover);
  --btn-bg-pale: var(--color-secondary-pale);
  --btn-outline-text: var(--color-secondary-active);
}
.base-button--accent {
  --btn-bg: var(--color-accent-hover);
  --btn-bg-hover: var(--color-accent);
  --btn-color: var(--color-black);
  --btn-border: var(--color-accent-hover);
  --btn-bg-pale: var(--color-accent-pale);
  --btn-outline-text: var(--color-accent-active);
}
.base-button--accent2 {
  --btn-bg: var(--color-accent2-hover);
  --btn-bg-hover: var(--color-accent2);
  --btn-color: var(--color-black);
  --btn-border: var(--color-accent2-hover);
  --btn-bg-pale: var(--color-accent2-pale);
  --btn-outline-text: var(--color-accent2-active);
}
.base-button--success {
  --btn-bg: var(--color-success-hover);
  --btn-bg-hover: var(--color-success);
  --btn-color: var(--color-black);
  --btn-border: var(--color-success-hover);
  --btn-bg-pale: var(--color-success-pale);
  --btn-outline-text: var(--color-success-active);
}
.base-button--error {
  --btn-bg: var(--color-error-hover);
  --btn-bg-hover: var(--color-error);
  --btn-color: var(--color-black);
  --btn-border: var(--color-error-hover);
  --btn-bg-pale: var(--color-error-pale);
  --btn-outline-text: var(--color-error-active);
}
.base-button--gradient {
  --btn-bg: linear-gradient(
    135deg,
    var(--color-accent-hover) 0%,
    var(--color-accent2-hover) 100%
  );
  --btn-bg-hover: linear-gradient(
    135deg,
    var(--color-accent-hover) 0%,
    var(--color-accent2-hover) 100%
  );
  --btn-color: var(--color-black);
  --btn-border: var(--color-primary-hover);
  --btn-bg-pale: var(--color-gradient-pale);
  --btn-outline-text: var(--color-primary-active);
}
.base-button--white {
  --btn-bg: var(--color-white-hover);
  --btn-bg-hover: var(--color-white);
  --btn-color: var(--color-black);
  --btn-border: var(--color-white-hover);
  --btn-bg-pale: var(--color-white-pale);
  --btn-outline-text: var(--color-black);
}

/* Formes */
.base-button--round {
  border-radius: 999px;
}

.base-button--square {
  border-radius: var(--radius-md);
}

.base-button--outline {
  background: var(
    --btn-bg-pale,
    color-mix(in srgb, var(--btn-border) 25%, white)
  );
  color: var(--btn-outline-text, var(--btn-border));
  border: 1px solid var(--btn-border, rgba(255, 255, 255, 0.3));
}
.base-button--outline:hover:not(:disabled) {
  background: var(--btn-border, var(--btn-bg));
  color: var(--btn-color, var(--color-white));
}

.base-button--outline.base-button--primary,
.base-button--outline.base-button--gradient {
  color: var(--color-white);
}

.base-button--outline.base-button--gradient:hover:not(:disabled) {
  color: var(--color-white);
}

/* white n'a pas de teinte vive à diluer en fond pâle (contrairement aux
   autres couleurs) — sans ceci, outline+white rend quasi identique au
   rempli. Ici, un vrai bouton fantôme à la place. */
.base-button--outline.base-button--white {
  background: transparent;
  border-color: var(--color-white);
  color: var(--color-white);
}

.base-button--link {
  background: transparent;
  border: none;
  padding: 4px 8px;
  text-decoration: underline;
  color: var(--btn-border, var(--color-white));
}
.base-button--link:hover:not(:disabled) {
  color: var(--btn-bg-hover, var(--btn-bg));
  background: color-mix(
    in srgb,
    var(--btn-border, currentColor) 10%,
    transparent
  );
}

/* États */
.base-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.base-button--loading {
  cursor: not-allowed;
}

.base-button__spinner {
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.base-button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
