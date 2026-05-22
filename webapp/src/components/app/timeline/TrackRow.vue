<script setup lang="ts">
import { computed, ref } from "vue";
import type { Track, AutomatableParam } from "../../../lib/utils/types";
import { useTimelineStore } from "../../../stores/timelineStore";
import { AUTOMATABLE_PARAMS } from "../../../lib/audio/automation";
import TrackHeader from "./TrackHeader.vue";
import TrackTimelinePreview from "./TrackTimelinePreview.vue";
import TrackTimelinePreviewCanvas from "./TrackTimelinePreviewCanvas.vue";
import AudioClipPreview from "./AudioClipPreview.vue";
import AudioClipPreviewCanvas from "./AudioClipPreviewCanvas.vue";
import PianoRoll from "./PianoRoll/PianoRoll.vue";
import AutomationLaneComponent from "./AutomationLane.vue";

const USE_CANVAS = true;
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
}>();

const emit = defineEmits<{
  (e: "toggle-mute", track: Track): void;
  (e: "toggle-solo", track: Track): void;
  (e: "select-track", track: Track): void;
  (e: "rename-track", track: Track): void;
  (e: "delete-track", track: Track): void;
  (e: "open-settings", track: Track): void;
  (e: "toggle-expand", track: Track): void;
}>();

const timelineStore = useTimelineStore();

const isAudioTrack = computed(
  () => props.track.instrument.type === "audioTrack",
);

const showAddLaneMenu = ref(false);

const usedParams = computed(
  () => new Set(props.track.automationLanes?.map((l) => l.parameter) ?? []),
);

const availableParams = computed(() =>
  (Object.keys(AUTOMATABLE_PARAMS) as AutomatableParam[]).filter(
    (p) => !usedParams.value.has(p),
  ),
);

const handleAddLane = (param: AutomatableParam) => {
  timelineStore.addAutomationLane(props.track.id, param);
  showAddLaneMenu.value = false;
};

const handleRemoveLane = (laneId: string) => {
  timelineStore.removeAutomationLane(props.track.id, laneId);
};
</script>

<template>
  <div
    class="track-row"
    :class="{ active: isActive, muted: track.muted, expanded: isExpanded }"
  >
    <TrackHeader
      :track="track"
      :is-active="isActive"
      :is-expanded="isExpanded"
      @toggle-mute="emit('toggle-mute', track)"
      @toggle-solo="emit('toggle-solo', track)"
      @select="emit('select-track', track)"
      @rename="emit('rename-track', track)"
      @open-settings="emit('open-settings', track)"
      @toggle-expand="emit('toggle-expand', track)"
      @delete-track="emit('delete-track', track)"
    />

    <component
      :is="USE_CANVAS ? TrackTimelinePreviewCanvas : TrackTimelinePreview"
      v-if="!isAudioTrack"
      :notes="track.notes"
      :cols="cols"
      :col-width="colWidth"
      :row-height="rowHeight"
      :color="track.color"
      @dblclick="emit('toggle-expand', track)"
    />

    <component
      :is="USE_CANVAS ? AudioClipPreviewCanvas : AudioClipPreview"
      v-else
      :clips="track.clips ?? []"
      :cols="cols"
      :col-width="colWidth"
      :row-height="rowHeight"
      :color="track.color"
      @dblclick="emit('toggle-expand', track)"
    />

    <PianoRoll
      v-if="isExpanded && !isAudioTrack"
      :track="track"
      :cols="cols"
      :col-width="colWidth"
      :playback-position="playbackPosition"
      :is-playing="isPlaying"
    />

    <AudioClipRow
      v-else-if="isExpanded && isAudioTrack"
      :track="track"
      :cols="cols"
      :col-width="colWidth"
      :playback-position="playbackPosition"
      :is-playing="isPlaying"
    />

    <!-- Automation Lanes -->
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

    <!-- Add automation lane row -->
    <div class="automation-add-row">
      <div class="automation-add-header">
        <div class="add-lane-wrapper">
          <button
            class="add-lane-btn"
            :disabled="availableParams.length === 0"
            title="Ajouter une lane d'automation"
            @click="showAddLaneMenu = !showAddLaneMenu"
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
      </div>
      <div class="automation-add-spacer" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.track-row {
  display: grid;
  grid-template-columns: 180px 1fr;
  grid-template-rows: auto auto;
  border-bottom: 1px solid rgba(122, 15, 62, 0.5);

  &.active :deep(.track-header) {
    background: #3d1528;
  }

  &.muted {
    opacity: 0.5;
  }

  &.expanded :deep(.track-header) {
    background: #3d1528;
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

:deep(.automation-lane-wrapper) {
  grid-column: 1 / -1;
}

.automation-add-row {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 180px 1fr;
  border-top: 1px solid rgba(122, 15, 62, 0.15);
}

.automation-add-header {
  padding: 4px 8px;
  display: flex;
  align-items: center;
}

.automation-add-spacer {
  background: #1a0e15;
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
  border: 1px solid rgba(122, 15, 62, 0.4);
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
  background: #2a1020;
  border: 1px solid rgba(122, 15, 62, 0.5);
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
    color: #fff;
  }
}
</style>
