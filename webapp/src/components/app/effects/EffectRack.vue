<script setup lang="ts">
import { ref } from "vue";
import { vOnClickOutside } from "@vueuse/components";
import type { EffectInstanceConfig } from "../../../lib/utils/types";
import { listEffectDefinitions } from "../../../lib/audio/effects";
import { useTimelineStore } from "../../../stores/timelineStore";
import { useDropdown } from "../../../composables/useDropdown";
import EffectSlot from "./EffectSlot.vue";

const props = defineProps<{
  trackId: string; // "master" pour le bus master
  effects: EffectInstanceConfig[];
}>();

const timelineStore = useTimelineStore();

const {
  isOpen: showAddMenu,
  toggle: toggleAddMenu,
  close: closeAddMenu,
} = useDropdown();

const dragIndex = ref<number | null>(null);

const handleDragStart = (index: number) => {
  dragIndex.value = index;
};

const handleDrop = (index: number) => {
  if (dragIndex.value !== null && dragIndex.value !== index) {
    timelineStore.reorderEffect(props.trackId, dragIndex.value, index);
  }
  dragIndex.value = null;
};

const handleAdd = (type: string) => {
  timelineStore.addEffect(props.trackId, type);
  closeAddMenu();
};

const handleRemove = (effectId: string) => {
  timelineStore.removeEffect(props.trackId, effectId);
};

const handleToggle = (effectId: string, enabled: boolean) => {
  timelineStore.setEffectEnabled(props.trackId, effectId, enabled);
};

const handleUpdateParam = (
  effectId: string,
  paramId: string,
  value: number,
) => {
  timelineStore.updateEffectParam(props.trackId, effectId, paramId, value);
};
</script>

<template>
  <div class="effect-rack">
    <EffectSlot
      v-for="(effect, index) in effects"
      :key="effect.id"
      :track-id="trackId"
      :effect="effect"
      :index="index"
      @remove="handleRemove(effect.id)"
      @toggle="(enabled) => handleToggle(effect.id, enabled)"
      @update-param="
        (paramId, value) => handleUpdateParam(effect.id, paramId, value)
      "
      @drag-start="handleDragStart"
      @drop="handleDrop"
    />

    <div class="add-effect-wrapper" v-on-click-outside="closeAddMenu">
      <button class="add-effect-btn" @click.stop="toggleAddMenu">
        + Ajouter un effet
      </button>
      <div v-if="showAddMenu" class="add-effect-menu">
        <button
          v-for="def in listEffectDefinitions()"
          :key="def.type"
          class="add-effect-menu-item"
          @click="handleAdd(def.type)"
        >
          {{ def.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.effect-rack {
  display: flex;
  flex-direction: column;
}

.add-effect-wrapper {
  position: relative;
}

.add-effect-btn {
  width: 100%;
  padding: 8px;
  border: 1px dashed rgba(var(--color-accent3-rgb), 0.4);
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    color: rgba(255, 255, 255, 0.8);
    border-color: rgba(255, 63, 180, 0.5);
    background: rgba(255, 63, 180, 0.05);
  }
}

.add-effect-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 100;
  background: var(--color-bg-daw-dropdown);
  border: 1px solid var(--color-border-secondary);
  border-radius: 6px;
  padding: 4px 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}

.add-effect-menu-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  background: none;
  border: none;
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: rgba(255, 63, 180, 0.1);
    /* stylelint-disable-next-line color-no-hex -- blanc pur pour contraste maximal sur fond saturé */
    color: #fff;
  }
}
</style>
