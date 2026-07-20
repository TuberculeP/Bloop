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
        'base-button--active': active,
      },
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
    :title="tooltip"
  >
    <span v-if="loading" class="base-button__spinner">⟳</span>
    <i v-if="leftIcon && !loading" :class="leftIcon" />
    <span v-if="label">{{ label }}</span>
    <i v-if="rightIcon && !loading" :class="rightIcon" />
    <slot v-else />
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

export interface ButtonProps {
  variant?:
    | "contain"
    | "round"
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
  active?: boolean;
  rightIcon?: string;
  leftIcon?: string;
  label?: string;
  tooltip?: string;
}

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: "contain",
  color: "primary",
  size: "normal",
  disabled: false,
  loading: false,
  active: false,
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
  border-radius: var(--radius-md);
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
  /* --color-error et --color-error-hover sont deux rouges de luminosité
     quasi identique (ni le texte noir ni blanc n'atteint 4.5:1 dessus,
     3.28-3.94:1 mesurés) — contrairement aux autres palettes, on ne peut
     pas juste garder le même schéma "-hover au repos / base au survol".
     On utilise donc -active (plus foncé) au repos avec du texte blanc
     (5.83:1, conforme AA), et -error (un peu plus clair) au survol. */
  --btn-bg: var(--color-error-active);
  --btn-bg-hover: var(--color-error);
  --btn-color: var(--color-white);
  --btn-border: var(--color-error-active);
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

.base-button--outline.base-button--primary {
  color: var(--color-white);
}

.base-button--outline.base-button--gradient {
  color: var(--color-white);
  background: var(--btn-bg-pale);
  border: 1px solid var(--color-accent);
}

.base-button--outline.base-button--gradient:hover:not(:disabled) {
  background: linear-gradient(
    135deg,
    var(--color-accent-hover) 0%,
    var(--color-accent2-hover) 100%
  );
  color: var(--color-black);
}

/* white a bien une teinte pâle dédiée (--color-white-pale, blanc 10%
   d'opacité), câblée sur --btn-bg-pale comme les autres couleurs — on
   n'a donc plus besoin de forcer un fond transparent ici, ça ferait
   perdre le fond pâle attendu pour rien. On garde juste bordure/texte
   en blanc plein pour la lisibilité. */
.base-button--outline.base-button--white {
  border-color: var(--color-white);
  color: var(--color-white);
}

/* --color-error-active (texte outline par défaut pour error) donne un
   contraste de 2.56:1 sur le fond sombre de la page — illisible. Même
   traitement que primary/gradient/white ci-dessus : on force du blanc. */
.base-button--outline.base-button--error {
  color: var(--color-white);
}

.base-button--link {
  background: transparent;
  border: none;
  padding: 10px 18px;
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

/* Actif = état "allumé" d'un toggle (ex: MCP activé, projet public, favori).
   Fond = couleur de fond normale (--btn-bg), bordure = couleur hover
   (--btn-bg-hover), pour que la bordure ressorte clairement plutôt que
   de se fondre dans le fond (c'était le bug qui faisait paraître le
   bouton actif plus "plat"/plus petit que les autres : fond et bordure
   avaient la même valeur, donc aucune bordure visible). Ça reste affiché
   même sans survol, et ça force le rendu plein peu importe la forme
   (outline/link). */
.base-button--active {
  background: var(--btn-bg);
  color: var(--btn-color);
  border-color: var(--btn-bg-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--btn-border) 30%, transparent);
}

/* :hover:not(:disabled) a une spécificité plus forte que .base-button--active
   à lui seul (3 sélecteurs vs 1) : sans cette règle, survoler un bouton
   actif lui ferait perdre son style actif (fond + bordure) le temps du
   survol. On réaffirme donc explicitement le style actif ici aussi. */
.base-button--active:hover:not(:disabled) {
  background: var(--btn-bg);
  border-color: var(--btn-bg-hover);
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
