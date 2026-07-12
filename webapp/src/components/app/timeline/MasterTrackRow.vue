<script setup lang="ts">
import { computed } from "vue";
import { vOnClickOutside } from "@vueuse/components";
import type { AutomatableParam } from "../../../lib/utils/types";
import { useTimelineStore } from "../../../stores/timelineStore";
import { AUTOMATABLE_PARAMS } from "../../../lib/audio/automation";
import MasterTrackHeader from "./MasterTrackHeader.vue";
import AutomationLaneComponent from "./AutomationLane.vue";
import { useDropdown } from "../../../composables/useDropdown";

const MASTER_COLOR = "#ff3fb4";

const props = defineProps<{
  cols: number;
  colWidth: number;
  scrollLeft: number;
}>();

const emit = defineEmits<{
  (e: "open-settings"): void;
}>();

const timelineStore = useTimelineStore();

const {
  isOpen: showAddLaneMenu,
  toggle: toggleAddLaneMenu,
  close: closeAddLaneMenu,
} = useDropdown();

const isAutomationExpanded = computed(
  () => timelineStore.automationExpandedMaster,
);

const usedParams = computed(
  () => new Set(timelineStore.masterAutomationLanes.map((l) => l.parameter)),
);

const availableParams = computed(() =>
  (Object.keys(AUTOMATABLE_PARAMS) as AutomatableParam[]).filter(
    (p) => !usedParams.value.has(p),
  ),
);

const handleAddLane = (param: AutomatableParam) => {
  timelineStore.addMasterAutomationLane(param);
  closeAddLaneMenu();
};

const handleRemoveLane = (laneId: string) => {
  timelineStore.removeMasterAutomationLane(laneId);
};

const handleToggleAutomation = () => {
  timelineStore.toggleMasterAutomationExpanded();
  closeAddLaneMenu();
};
</script>

<template>
  <div>
    <div
      class="master-track-row"
      :style="{ minWidth: `${180 + props.cols * props.colWidth}px` }"
    >
      <MasterTrackHeader @open-settings="emit('open-settings')" />
      <div class="master-track-zone" />
    </div>

    <!-- Automation drawer -->
    <div v-if="isAutomationExpanded" class="automation-drawer">
      <AutomationLaneComponent
        v-for="lane in timelineStore.masterAutomationLanes"
        :key="lane.id"
        :lane="lane"
        :cols="props.cols"
        :col-width="props.colWidth"
        :track-color="MASTER_COLOR"
        :scroll-left="props.scrollLeft"
        @remove="handleRemoveLane(lane.id)"
      />
      <div class="drawer-add-bar">
        <div class="add-lane-wrapper" v-on-click-outside="closeAddLaneMenu">
          <button
            class="add-lane-btn"
            :disabled="availableParams.length === 0"
            title="Ajouter un paramètre"
            @click.stop="toggleAddLaneMenu"
          >
            +
            <svg
              width="12"
              height="10"
              viewBox="0 0 12 10"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 8 C2 8 2 2 4 2 C6 2 6 6 8 5 C10 4 10 2 12 2"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                fill="none"
              />
            </svg>
          </button>
          <div v-if="showAddLaneMenu" class="add-lane-menu">
            <button
              v-for="param in availableParams"
              :key="param"
              class="add-lane-menu-item"
              @click="handleAddLane(param)"
            >
              {{ AUTOMATABLE_PARAMS[param].label }}
            </button>
          </div>
        </div>
        <div class="drawer-add-spacer" />
      </div>
    </div>

    <!-- Toggle automation button -->
    <div class="automation-toggle-row">
      <button
        class="automation-toggle-btn"
        :class="{ active: isAutomationExpanded }"
        title="Automation"
        @click="handleToggleAutomation"
      >
        <svg
          width="12"
          height="10"
          viewBox="0 0 12 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 8 C2 8 2 2 4 2 C6 2 6 6 8 5 C10 4 10 2 12 2"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            fill="none"
          />
        </svg>
        <span>Auto</span>
        <span
          v-if="timelineStore.masterAutomationLanes.length"
          class="lane-count"
          >{{ timelineStore.masterAutomationLanes.length }}</span
        >
      </button>
      <div class="automation-toggle-spacer" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.master-track-row {
  display: grid;
  grid-template-columns: 180px 1fr;
  position: sticky;
  top: 0;
  z-index: 60;
  border-bottom: 2px solid var(--color-accent2);
}

.master-track-zone {
  /* stylelint-disable-next-line color-no-hex -- teinte de fond propre à cette zone, usage unique */
  background: #241019;
}

.automation-drawer {
  border-top: 1px solid rgba(var(--color-accent3-rgb), 0.3);
}

.drawer-add-bar {
  display: grid;
  grid-template-columns: 180px 1fr;
  border-top: 1px solid rgba(var(--color-accent3-rgb), 0.15);
}

.drawer-add-bar > :first-child {
  padding: 4px 8px;
  display: flex;
  align-items: center;
}

.drawer-add-spacer {
  background: var(--color-bg-primary-dark);
}

.automation-toggle-row {
  display: grid;
  grid-template-columns: 180px 1fr;
  border-top: 1px solid rgba(var(--color-accent3-rgb), 0.15);
}

.automation-toggle-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 3px 8px;
  padding: 2px 7px;
  border: 1px solid rgba(var(--color-accent3-rgb), 0.3);
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.3);
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.1s;
  letter-spacing: 0.03em;

  &:hover {
    color: rgba(255, 255, 255, 0.6);
    border-color: rgba(255, 63, 180, 0.4);
  }

  &.active {
    color: var(--color-accent2);
    border-color: rgba(255, 63, 180, 0.6);
    background: rgba(255, 63, 180, 0.08);
  }
}

.lane-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 7px;
  background: rgba(255, 63, 180, 0.25);
  color: var(--color-accent2);
  font-size: 9px;
}

.automation-toggle-spacer {
  background: var(--color-bg-daw-deep);
}

.add-lane-wrapper {
  position: relative;
}

.add-lane-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  padding: 3px 7px;
  border: 1px solid rgba(var(--color-accent3-rgb), 0.4);
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  transition: all 0.1s;
  line-height: 1;

  &:hover:not(:disabled) {
    color: rgba(255, 255, 255, 0.7);
    border-color: rgba(255, 63, 180, 0.5);
    background: rgba(255, 63, 180, 0.05);
  }

  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
}

.add-lane-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 100;
  background: var(--color-bg-daw-dropdown);
  border: 1px solid var(--color-border-secondary);
  border-radius: 6px;
  padding: 4px 0;
  min-width: 140px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}

.add-lane-menu-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 6px 12px;
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
