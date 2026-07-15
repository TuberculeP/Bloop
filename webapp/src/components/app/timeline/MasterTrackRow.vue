<script setup lang="ts">
import { computed } from "vue";
import { useTimelineStore } from "../../../stores/timelineStore";
import MasterTrackHeader from "./MasterTrackHeader.vue";
import AutomationLaneComponent from "./AutomationLane.vue";

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

const isAutomationExpanded = computed(
  () => timelineStore.automationExpandedMaster,
);

// Le bouton "Auto" n'a plus d'utilité sans lane à afficher/masquer (la
// création se fait désormais depuis le menu de chaque effet) — sauf si le
// drawer est déjà ouvert (ex: dernière lane retirée), pour garder un moyen
// de le refermer.
const showAutomationToggle = computed(
  () =>
    timelineStore.masterAutomationLanes.length > 0 ||
    isAutomationExpanded.value,
);

const handleRemoveLane = (laneId: string) => {
  timelineStore.removeAutomationLane("master", laneId);
};

const handleToggleAutomation = () => {
  timelineStore.toggleMasterAutomationExpanded();
};
</script>

<template>
  <div
    class="master-track-row-wrapper"
    :style="{ minWidth: `${180 + props.cols * props.colWidth}px` }"
  >
    <div class="master-track-row">
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
    </div>

    <!-- Toggle automation button -->
    <div v-if="showAutomationToggle" class="automation-toggle-row">
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
  border-radius: var(--radius-sm);
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
</style>
