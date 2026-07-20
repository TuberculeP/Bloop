<template>
  <AdminLayout>
    <main class="admin-button">
      <div class="showcase-container">
        <header class="showcase-header">
          <h1>BaseButton — Showcase</h1>
          <p>
            Toutes les combinaisons possibles de forme, couleur, taille et état.
          </p>
        </header>

        <!-- ==================== FORMES × COULEURS (avec label) ==================== -->
        <section
          v-for="shape in shapes"
          :key="shape.value"
          class="showcase-section"
        >
          <h2 class="showcase-section-title">
            variant="{{ shape.value }}"
            <span class="showcase-section-hint">{{ shape.hint }}</span>
          </h2>
          <div class="showcase-row">
            <div v-for="color in colors" :key="color" class="showcase-item">
              <BaseButton
                :variant="shape.value"
                :color="color"
                :label="color"
              />
              <span class="showcase-label">color="{{ color }}"</span>
            </div>
          </div>
        </section>

        <!-- ==================== FORMES × COULEURS (icon-only) ==================== -->
        <section class="showcase-section">
          <h2 class="showcase-section-title">
            Icon-only
            <span class="showcase-section-hint"
              >sans label — carré/rond selon la forme</span
            >
          </h2>
          <div
            v-for="shape in shapes"
            :key="`icon-${shape.value}`"
            class="showcase-subblock"
          >
            <p class="showcase-subblock-title">variant="{{ shape.value }}"</p>
            <div class="showcase-row">
              <div v-for="color in colors" :key="color" class="showcase-item">
                <BaseButton
                  :variant="shape.value"
                  :color="color"
                  left-icon="fas fa-star"
                />
                <span class="showcase-label">color="{{ color }}"</span>
              </div>
            </div>
          </div>
        </section>

        <!-- ==================== TAILLES ==================== -->
        <section class="showcase-section">
          <h2 class="showcase-section-title">size (avec label)</h2>
          <div class="showcase-row">
            <div v-for="size in sizes" :key="size" class="showcase-item">
              <BaseButton :size="size" color="primary" label="Bouton" />
              <span class="showcase-label">size="{{ size }}"</span>
            </div>
          </div>
        </section>

        <section class="showcase-section">
          <h2 class="showcase-section-title">
            size
            <span class="showcase-section-hint">icon-only</span>
          </h2>
          <div class="showcase-row">
            <div
              v-for="size in sizes"
              :key="`icon-${size}`"
              class="showcase-item"
            >
              <BaseButton
                :size="size"
                color="primary"
                left-icon="fas fa-star"
              />
              <span class="showcase-label">size="{{ size }}"</span>
            </div>
          </div>
        </section>

        <!-- ==================== ACTIF ==================== -->
        <section class="showcase-section">
          <h2 class="showcase-section-title">
            active
            <span class="showcase-section-hint"
              >état "allumé" — fond normal + bordure hover</span
            >
          </h2>

          <p class="showcase-subblock-title">Chaque forme, avec label</p>
          <div class="showcase-row">
            <div
              v-for="shape in shapes"
              :key="`active-${shape.value}`"
              class="showcase-item"
            >
              <BaseButton
                :variant="shape.value"
                color="accent2"
                label="Actif"
                active
              />
              <span class="showcase-label">variant="{{ shape.value }}"</span>
            </div>
          </div>

          <p class="showcase-subblock-title">
            Chaque couleur, icon-only (cas du screenshot)
          </p>
          <div class="showcase-row">
            <div
              v-for="color in colors"
              :key="`active-icon-${color}`"
              class="showcase-item"
            >
              <BaseButton :color="color" left-icon="fas fa-globe" active />
              <span class="showcase-label">color="{{ color }}"</span>
            </div>
          </div>

          <p class="showcase-subblock-title">
            Interactif — clique pour toggle l'état actif
          </p>
          <div class="showcase-row">
            <div class="showcase-item">
              <BaseButton
                color="accent2"
                left-icon="fas fa-heart"
                :active="isFavorite"
                @click="isFavorite = !isFavorite"
              />
              <span class="showcase-label">
                active = {{ isFavorite }} (survole-le pour vérifier que la
                bordure reste visible)
              </span>
            </div>
          </div>
        </section>

        <!-- ==================== ICÔNES ==================== -->
        <section class="showcase-section">
          <h2 class="showcase-section-title">Icônes</h2>
          <div class="showcase-row">
            <div class="showcase-item">
              <BaseButton
                color="primary"
                label="Envoyer"
                left-icon="fas fa-paper-plane"
              />
              <span class="showcase-label">left-icon</span>
            </div>
            <div class="showcase-item">
              <BaseButton
                color="primary"
                label="Suivant"
                right-icon="fas fa-arrow-right"
              />
              <span class="showcase-label">right-icon</span>
            </div>
            <div class="showcase-item">
              <BaseButton
                color="primary"
                label="Options"
                left-icon="fas fa-cog"
                right-icon="fas fa-chevron-down"
              />
              <span class="showcase-label">left-icon + right-icon</span>
            </div>
            <div class="showcase-item">
              <BaseButton color="primary" left-icon="fas fa-heart" />
              <span class="showcase-label">icon-only (contain)</span>
            </div>
            <div class="showcase-item">
              <BaseButton
                variant="round"
                color="accent2"
                left-icon="fas fa-play"
              />
              <span class="showcase-label">icon-only (round)</span>
            </div>
            <div class="showcase-item">
              <BaseButton
                variant="outline"
                color="white"
                left-icon="fas fa-times"
              />
              <span class="showcase-label">icon-only (outline)</span>
            </div>
            <div class="showcase-item">
              <BaseButton
                color="primary"
                label="Aide"
                left-icon="fas fa-question-circle"
                tooltip="Ouvrir le centre d'aide"
              />
              <span class="showcase-label">tooltip (survole-moi)</span>
            </div>
          </div>
        </section>

        <!-- ==================== ÉTATS ==================== -->
        <section class="showcase-section">
          <h2 class="showcase-section-title">États</h2>

          <p class="showcase-subblock-title">Avec label, par forme</p>
          <div
            v-for="shape in shapes"
            :key="`state-${shape.value}`"
            class="showcase-row showcase-row--tight"
          >
            <div class="showcase-item">
              <BaseButton
                :variant="shape.value"
                color="primary"
                label="Normal"
              />
              <span class="showcase-label">{{ shape.value }} — défaut</span>
            </div>
            <div class="showcase-item">
              <BaseButton
                :variant="shape.value"
                color="primary"
                label="Désactivé"
                disabled
              />
              <span class="showcase-label">{{ shape.value }} — disabled</span>
            </div>
            <div class="showcase-item">
              <BaseButton
                :variant="shape.value"
                color="primary"
                label="Chargement"
                loading
              />
              <span class="showcase-label">{{ shape.value }} — loading</span>
            </div>
          </div>

          <p class="showcase-subblock-title">Icon-only, disabled / loading</p>
          <div class="showcase-row">
            <div class="showcase-item">
              <BaseButton color="primary" left-icon="fas fa-trash" disabled />
              <span class="showcase-label">disabled</span>
            </div>
            <div class="showcase-item">
              <BaseButton color="primary" left-icon="fas fa-trash" loading />
              <span class="showcase-label">loading (spinner + icône)</span>
            </div>
            <div class="showcase-item">
              <BaseButton
                variant="outline"
                color="error"
                left-icon="fas fa-trash"
                disabled
              />
              <span class="showcase-label">outline — disabled</span>
            </div>
          </div>
        </section>

        <!-- ==================== VARIANTS NON STYLÉS ==================== -->
        <section class="showcase-section">
          <h2 class="showcase-section-title">
            Variants sans style dédié
            <span class="showcase-section-hint"
              >acceptés par le type TS mais aucune règle CSS ne les cible —
              retombent sur le style de base (.base-button)</span
            >
          </h2>
          <div class="showcase-row">
            <div v-for="v in unstyledVariants" :key="v" class="showcase-item">
              <BaseButton :variant="v" color="primary" label="Test" />
              <span class="showcase-label">variant="{{ v }}"</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref } from "vue";
import BaseButton from "../../components/ui/BaseButton.vue";
import AdminLayout from "../../layouts/AdminLayout.vue";

const shapes = [
  { value: "contain", hint: "rempli (défaut)" },
  { value: "round", hint: "pilule" },
  { value: "outline", hint: "fond pâle + bordure" },
  { value: "link", hint: "texte souligné" },
] as const;

const colors = [
  "primary",
  "secondary",
  "accent",
  "accent2",
  "success",
  "error",
  "gradient",
  "white",
] as const;

const sizes = ["small", "normal", "large"] as const;

// Variants présents dans ButtonProps["variant"] mais sans aucune règle CSS
// dédiée (.base-button--danger, --ghost, --lightghost, --lightlink n'existent
// pas dans le style scoped) : ils s'affichent avec le style de base uniquement.
const unstyledVariants = [
  "danger",
  "ghost",
  "lightghost",
  "lightlink",
] as const;

const isFavorite = ref(false);
</script>

<style scoped>
.showcase-container {
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 3.5rem;
}

.showcase-header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.showcase-header p {
  color: rgba(255, 255, 255, 0.6);
}

.showcase-section-title {
  font-size: 1.1rem;
  font-family: "Courier New", monospace;
  color: var(--color-accent);
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.showcase-section-hint {
  font-family: inherit;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
  margin-left: 0.75rem;
}

.showcase-subblock {
  margin-bottom: 1.75rem;
}
.showcase-subblock:last-child {
  margin-bottom: 0;
}

.showcase-subblock-title {
  font-size: 0.85rem;
  font-family: "Courier New", monospace;
  color: rgba(255, 255, 255, 0.55);
  margin: 0 0 0.75rem;
}

.showcase-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 1.25rem;
}
.showcase-row:last-child {
  margin-bottom: 0;
}

.showcase-row--tight {
  gap: 1rem;
}

.showcase-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.6rem;
}

.showcase-label {
  font-size: 0.75rem;
  font-family: "Courier New", monospace;
  color: rgba(255, 255, 255, 0.4);
  max-width: 160px;
}
</style>
