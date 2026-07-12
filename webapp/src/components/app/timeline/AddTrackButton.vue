<script setup lang="ts">
import { vOnClickOutside } from "@vueuse/components";
import type { InstrumentType } from "../../../lib/utils/types";
import BaseButton from "../../ui/BaseButton.vue";
import { useDropdown } from "../../../composables/useDropdown";

const emit = defineEmits<{
  (e: "add-track", type: InstrumentType): void;
}>();

const {
  isOpen: showMenu,
  toggle: toggleMenu,
  close: closeMenu,
} = useDropdown();

const instruments = [
  {
    type: "audioTrack" as InstrumentType,
    name: "Audio",
    icon: "🔊",
    description: "Piste audio pour samples et boucles",
  },
  {
    type: "basicSynth" as InstrumentType,
    name: "Synth",
    icon: "🎹",
    description: "Oscillateur simple (sine, square, saw, triangle)",
  },
  {
    type: "elementarySynth" as InstrumentType,
    name: "Elementary",
    icon: "🎛️",
    description: "Synthétiseur avancé avec ADSR",
  },
  {
    type: "smplr" as InstrumentType,
    name: "Sampler",
    icon: "🎸",
    description: "Instruments réalistes (piano, guitare, etc.)",
  },
  {
    type: "undertale" as InstrumentType,
    name: "Undertale",
    icon: "💀",
    description: "Soundfont Undertale (plusieurs presets)",
  },
];

const handleSelect = (type: InstrumentType) => {
  emit("add-track", type);
  closeMenu();
};
</script>

<template>
  <div class="add-track-wrapper" v-on-click-outside="closeMenu">
    <BaseButton
      class="add-track-btn"
      variant="error"
      @click="toggleMenu"
      title="Ajouter une piste"
    >
      <span class="label">Nouvelle piste</span>
      <i class="fas fa-plus" />
    </BaseButton>

    <Transition name="fade">
      <div v-if="showMenu" class="instrument-menu">
        <div class="menu-header">Choisir un instrument</div>
        <button
          v-for="inst in instruments"
          :key="inst.type"
          class="instrument-option"
          @click="handleSelect(inst.type)"
        >
          <span class="inst-icon">{{ inst.icon }}</span>
          <div class="inst-info">
            <span class="inst-name">{{ inst.name }}</span>
            <span class="inst-desc">{{ inst.description }}</span>
          </div>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.add-track-wrapper {
  position: relative;
  padding-right: 12px;
}

.instrument-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 280px;
  background: var(--color-bg-secondary-dark);
  border: 1px solid var(--color-border-secondary);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  z-index: 100;
}

.menu-header {
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.6);
  background: var(--color-bg-primary-dark);
  border-bottom: 1px solid var(--color-border-secondary);
}

.instrument-option {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: var(--color-bg-daw-active);
  }

  &:not(:last-child) {
    border-bottom: 1px solid rgba(var(--color-accent3-rgb), 0.3);
  }
}

.inst-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-primary-dark);
  border-radius: 8px;
}

.inst-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.inst-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-white);
}

.inst-desc {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
