<script setup lang="ts">
import { computed } from "vue";
import type { Track } from "../../../lib/utils/types";
import { useTimelineStore } from "../../../stores/timelineStore";
import TrackHeader from "./TrackHeader.vue";
import TrackTimelinePreviewCanvas from "./TrackTimelinePreviewCanvas.vue";
import PianoRoll from "./PianoRoll/PianoRoll.vue";
import AutomationLaneComponent from "./AutomationLane.vue";
import { AudioClipRow } from "./AudioClipRow";

const props = defineProps<{
  track: Track;
  cols: number;
  colWidth: number;
  rowHeight: number;
  isExpanded: boolean;
  isActive?: boolean;
  playbackPosition: number;
  isPlaying: boolean;
  scrollLeft: number;
  viewportWidth: number;
}>();

const emit = defineEmits<{
  (e: "toggle-mute", track: Track): void;
  (e: "toggle-solo", track: Track): void;
  (e: "select-track", track: Track): void;
  (e: "rename-track", track: Track): void;
  (e: "delete-track", track: Track): void;
  (e: "open-settings", track: Track): void;
  (e: "toggle-expand", track: Track): void;
  (e: "import-midi", track: Track): void;
}>();

const timelineStore = useTimelineStore();

const isAudioTrack = computed(
  () => props.track.instrument.type === "audioTrack",
);

const isAutomationExpanded = computed(
  () => timelineStore.automationExpandedTrackId === props.track.id,
);

// Le bouton "Auto" n'a plus d'utilité sans lane à afficher/masquer (la
// création se fait désormais depuis le menu de chaque effet) — sauf si le
// drawer est déjà ouvert (ex: dernière lane retirée), pour garder un moyen
// de le refermer.
const showAutomationToggle = computed(
  () =>
    (props.track.automationLanes?.length ?? 0) > 0 ||
    isAutomationExpanded.value,
);

const handleRemoveLane = (laneId: string) => {
  timelineStore.removeAutomationLane(props.track.id, laneId);
};

const handleToggleAutomation = () => {
  timelineStore.toggleAutomationExpanded(props.track.id);
};
</script>

<template>
  <div
    class="track-row"
    :class="{
      active: isActive,
      muted: track.muted,
      expanded: isExpanded,
      'audio-track': isAudioTrack,
    }"
    :style="{ minWidth: `${180 + cols * colWidth}px` }"
  >
    <TrackHeader
      :track="track"
      :is-active="isActive"
      :is-expanded="isExpanded"
      :is-audio-track="isAudioTrack"
      @toggle-mute="emit('toggle-mute', track)"
      @toggle-solo="emit('toggle-solo', track)"
      @select="emit('select-track', track)"
      @rename="emit('rename-track', track)"
      @open-settings="emit('open-settings', track)"
      @toggle-expand="emit('toggle-expand', track)"
      @delete-track="emit('delete-track', track)"
      @import-midi="emit('import-midi', track)"
    />

    <TrackTimelinePreviewCanvas
      v-if="!isAudioTrack"
      :notes="track.notes"
      :cols="cols"
      :col-width="colWidth"
      :row-height="rowHeight"
      :color="track.color"
      :scroll-left="scrollLeft"
      :viewport-width="viewportWidth"
      @dblclick="emit('toggle-expand', track)"
    />

    <PianoRoll
      v-if="isExpanded && !isAudioTrack"
      :track="track"
      :cols="cols"
      :col-width="colWidth"
      :playback-position="playbackPosition"
      :is-playing="isPlaying"
      :scroll-left="scrollLeft"
      :viewport-width="viewportWidth"
    />

    <AudioClipRow
      v-if="isAudioTrack"
      :track="track"
      :cols="cols"
      :col-width="colWidth"
      :playback-position="playbackPosition"
      :is-playing="isPlaying"
    />

    <!-- Automation drawer -->
    <div v-if="isAutomationExpanded" class="automation-drawer">
      <AutomationLaneComponent
        v-for="lane in track.automationLanes"
        :key="lane.id"
        :track-id="track.id"
        :lane="lane"
        :cols="cols"
        :col-width="colWidth"
        :track-color="track.color"
        :scroll-left="scrollLeft"
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
        <span v-if="track.automationLanes?.length" class="lane-count">{{
          track.automationLanes.length
        }}</span>
      </button>
      <div class="automation-toggle-spacer" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.track-row {
  display: grid;
  grid-template-columns: 180px 1fr;
  grid-template-rows: auto auto;
  border-bottom: 1px solid var(--color-border-secondary);

  &.active :deep(.track-header) {
    background: var(--color-bg-daw-active);
  }

  &.muted {
    opacity: 0.5;
  }

  &.expanded :deep(.track-header) {
    background: var(--color-bg-daw-active);
  }
}

:deep(.track-header) {
  grid-column: 1;
  grid-row: 1;
}

:deep(.track-timeline) {
  grid-column: 2;
  grid-row: 1;
}

:deep(.piano-roll-wrapper) {
  grid-column: 1 / -1;
  grid-row: 2;
}

:deep(.audio-clip-row-wrapper) {
  grid-column: 1 / -1;
  grid-row: 2;
}

.track-row.audio-track :deep(.audio-clip-row-wrapper) {
  grid-column: 2;
  grid-row: 1;
}

:deep(.automation-lane-wrapper) {
  grid-column: 1 / -1;
}

.automation-drawer {
  grid-column: 1 / -1;
  border-top: 1px solid rgba(var(--color-accent3-rgb), 0.3);
}

.automation-toggle-row {
  grid-column: 1 / -1;
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
