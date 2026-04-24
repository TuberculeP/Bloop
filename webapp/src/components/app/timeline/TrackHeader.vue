<script setup lang="ts">
import { computed, ref } from "vue";
import type { Track } from "../../../lib/utils/types";
import { useTrackAudioStore } from "../../../stores/trackAudioStore";

const props = defineProps<{
  track: Track;
  isActive?: boolean;
  isExpanded: boolean;
}>();

const trackAudioStore = useTrackAudioStore();

const isLoading = computed(() => {
  return trackAudioStore.getTrackEngineState(props.track.id) === "loading";
});

const emit = defineEmits<{
  (e: "toggle-mute"): void;
  (e: "toggle-solo"): void;
  (e: "select"): void;
  (e: "rename"): void;
  (e: "open-settings"): void;
  (e: "toggle-expand"): void;
  (e: "delete-track"): void;
}>();

const headerStyle = { borderLeftColor: props.track.color };

const menuOpen = ref(false);
const menuPosition = ref({ x: 0, y: 0 });

const menuItems = [
  {
    label: "Supprimer",
    icon: "fas fa-trash",
    action: () => emit("delete-track"),
    danger: true,
  },
];

function openMenu(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  menuPosition.value = { x: e.clientX, y: e.clientY };
  menuOpen.value = true;
}

function closeMenu() {
  menuOpen.value = false;
}

function handleAction(action: () => void) {
  closeMenu();
  action();
}
</script>

<template>
  <div
    class="track-header"
    :style="headerStyle"
    @click="emit('select')"
    @contextmenu="openMenu"
  >
    <div class="track-info">
      <div class="track-name-row">
        <span class="track-name" @dblclick.stop="emit('rename')">
          {{ track.name }}
        </span>
        <span v-if="isLoading" class="loading-spinner" title="Chargement...">
          ⟳
        </span>
      </div>
      <div class="track-controls">
        <button
          class="control-btn mute-btn"
          :class="{ active: track.muted }"
          @click.stop="emit('toggle-mute')"
          title="Mute"
        >
          M
        </button>
        <button
          class="control-btn solo-btn"
          :class="{ active: track.solo }"
          @click.stop="emit('toggle-solo')"
          title="Solo"
        >
          S
        </button>
        <button
          class="control-btn settings-btn"
          @click.stop="emit('open-settings')"
          title="Paramètres"
        >
          <i class="fas fa-cog"></i>
        </button>
        <button
          class="control-btn expand-btn"
          :class="{ active: isExpanded }"
          @click.stop="emit('toggle-expand')"
          :title="isExpanded ? 'Réduire' : 'Éditer'"
        >
          <i
            :class="isExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-up'"
          ></i>
        </button>

        <div class="more-menu-wrapper" @click.stop>
          <button class="control-btn more-btn" @click="openMenu" title="Plus">
            <i class="fas fa-ellipsis-v"></i>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Dropdown via Teleport -->
  <Teleport to="body">
    <div
      v-if="menuOpen"
      class="menu-overlay"
      @click="closeMenu"
      @contextmenu.prevent="closeMenu"
    >
      <ul
        class="dropdown"
        :style="{ top: menuPosition.y + 'px', left: menuPosition.x + 'px' }"
        @click.stop
      >
        <li
          v-for="item in menuItems"
          :key="item.label"
          class="dropdown-item"
          :class="{ danger: item.danger }"
          @click="handleAction(item.action)"
        >
          <i :class="item.icon"></i>
          {{ item.label }}
        </li>
      </ul>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.track-header {
  padding: 8px 12px;
  background: var(--color-bg-secondary-dark);
  border-left: 4px solid;
  display: flex;
  align-items: center;
  cursor: pointer;
  height: 75px;
  box-sizing: border-box;
  position: sticky;
  left: 0;
  z-index: 10;

  &:hover {
    background: var(--color-border-secondary);
  }
}

.track-info {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.track-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.track-name {
  font-size: 14px;
  font-weight: 500;
  color: #f2efe8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: text;

  &:hover {
    text-decoration: underline;
  }
}

.loading-spinner {
  font-size: 14px;
  color: #ff3fb4;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.track-controls {
  display: flex;
  gap: 4px;
}

.control-btn {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 3px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  background: var(--color-accent3);
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.15s ease;

  &:hover {
    background: var(--color-accent3-hover);
    color: var(--color-white);
  }

  &.active {
    background: var(--color-accent3-hover);
  }

  &.solo-btn.active,
  &.mute-btn.active {
    background: var(--color-validate-active);
    color: var(--color-black);
  }

  &.expand-btn.active {
    background: #ff3fb4;
  }
}

.more-menu-wrapper {
  position: relative;
}

.menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
}

.dropdown {
  position: fixed;
  background: #2d0f20;
  border: 1px solid #ff3fb4;
  border-radius: 4px;
  min-width: 150px;
  z-index: 1000;
  overflow: hidden;
  list-style: none;
  padding: 4px 0;
  margin: 0;
}

.dropdown-item {
  padding: 8px 14px;
  color: #f2efe8;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;

  &:hover {
    background: #3d1528;
  }

  &.danger {
    color: #ff6b6b;

    &:hover {
      background: #c0392b;
      color: #fff;
    }
  }
}
</style>
