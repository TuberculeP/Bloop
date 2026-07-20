<script setup lang="ts">
import { useTimelineStore } from "../../../stores/timelineStore";
import EffectParamRow from "../effects/EffectParamRow.vue";
import EffectRack from "../effects/EffectRack.vue";

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const timelineStore = useTimelineStore();

const handleVolumeChange = (volume: number) => {
  timelineStore.volume = volume;
};

const handleClose = () => {
  emit("close");
};
</script>

<template>
  <Teleport to="body">
    <Transition name="slide">
      <div v-if="visible" class="settings-overlay" @click.self="handleClose">
        <div class="settings-panel">
          <div class="panel-header">
            <h3>Master</h3>
            <button class="close-btn" @click="handleClose">×</button>
          </div>

          <div class="panel-body">
            <div class="setting-group">
              <EffectParamRow
                track-id="master"
                effect-id="channel"
                param-id="volume"
                label="Volume"
                unit="%"
                :min="0"
                :max="100"
                :model-value="timelineStore.volume"
                @update:model-value="handleVolumeChange"
              />
            </div>

            <div class="setting-group">
              <label class="setting-label">Effets</label>
              <EffectRack
                track-id="master"
                :effects="timelineStore.masterEffects"
              />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: flex-end;
  z-index: 900;
}

.settings-panel {
  width: 320px;
  height: 100%;
  background: var(--color-bg-secondary-dark);
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-secondary);

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--color-white);
  }
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 20px;
  cursor: pointer;

  &:hover {
    background: var(--color-accent3);
    color: var(--color-white);
  }
}

.panel-body {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.setting-group {
  margin-bottom: 24px;
}

.setting-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 8px;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  .settings-panel {
    transform: translateX(100%);
  }
}

@media (max-width: 480px) {
  .settings-panel {
    width: 100%;
  }
}
</style>
