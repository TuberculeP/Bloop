<template>
  <div class="button-showcase">
    <h2>Composant Button - Démonstration</h2>

    <!-- Tailles -->
    <section class="showcase-section">
      <h3>Tailles</h3>
      <div class="buttons-row">
        <BaseButton size="small" @click="handleClick" label="Petit" />
        <BaseButton size="normal" @click="handleClick" label="Normal" />
        <BaseButton size="large" @click="handleClick" label="Grand" />
      </div>
    </section>

    <!-- Variantes -->
    <section class="showcase-section">
      <h3>Variantes</h3>
      <div class="buttons-row">
        <BaseButton variant="primary" @click="handleClick" label="Primary" />
        <BaseButton
          variant="secondary"
          @click="handleClick"
          label="Secondary"
        />
        <BaseButton variant="accent" @click="handleClick" label="Accent" />
        <BaseButton variant="error" @click="handleClick" label="Error" />
        <BaseButton variant="link" @click="handleClick" label="Link" />
        <BaseButton variant="ghost" @click="handleClick" label="Ghost" />
      </div>
    </section>

    <!-- États -->
    <section class="showcase-section">
      <h3>États</h3>
      <div class="buttons-row">
        <BaseButton @click="handleClick" label="Normal" />
        <BaseButton disabled @click="handleClick" label="Disabled" />
        <BaseButton loading @click="handleClick" label="Loading" />
      </div>
    </section>

    <!-- Combinaisons -->
    <section class="showcase-section">
      <h3>Combinaisons</h3>
      <div class="buttons-row">
        <BaseButton
          variant="primary"
          size="small"
          @click="handleClick"
          label="Primary Small"
        />
        <BaseButton
          variant="secondary"
          size="large"
          @click="handleClick"
          label="Secondary Large"
        />
        <BaseButton
          variant="accent"
          size="normal"
          @click="handleClick"
          label="Accent Normal"
        />
        <BaseButton
          variant="ghost"
          size="normal"
          @click="handleClick"
          label="Accent Normal"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import BaseButton from "./BaseButton.vue";

const handleClick = (event: MouseEvent) => {
  console.log("Button clicked!", event);
};
</script>

<style scoped>
.button-showcase {
  padding: 20px;
  color: var(--color-white);
}

.showcase-section {
  margin-bottom: 32px;
}

.showcase-section h3 {
  color: var(--color-accent);
  margin-bottom: 16px;
}

.buttons-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
</style>
