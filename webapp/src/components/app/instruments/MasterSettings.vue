<script setup lang="ts">
import { useTimelineStore } from "../../../stores/timelineStore";
import TrackEqualizer from "./TrackEqualizer.vue";
import RangeSlider from "../../ui/RangeSlider.vue";

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

const handleReverbChange = (reverb: number) => {
  timelineStore.reverb = reverb;
};

const handleEQBandUpdate = (bandId: string, gain: number) => {
  timelineStore.updateEQBand(bandId, gain);
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
              <label class="setting-label">Volume</label>
              <RangeSlider
                :model-value="timelineStore.volume"
                :min="0"
                :max="100"
                unit="%"
                @update:model-value="handleVolumeChange"
              />
            </div>

            <div class="setting-group">
              <label class="setting-label">Reverb</label>
              <RangeSlider
                :model-value="timelineStore.reverb"
                :min="0"
                :max="100"
                unit="%"
                @update:model-value="handleReverbChange"
              />
            </div>

            <div class="setting-group">
              <label class="setting-label">Égaliseur</label>
              <TrackEqualizer
                :bands="timelineStore.eqBands"
                @update="handleEQBandUpdate"
              />
            </div>

            <div class="setting-group">
              <label class="setting-label">
                Compresseur
                <div class="toggle-switch">
                  <input
                    type="checkbox"
                    :checked="timelineStore.compressor.enabled"
                    @change="
                      timelineStore.updateCompressor({
                        enabled: ($event.target as HTMLInputElement).checked,
                      })
                    "
                  />
                </div>
              </label>
              <div class="compressor-controls">
                <div class="mini-slider">
                  <span class="mini-label">Threshold</span>
                  <RangeSlider
                    :model-value="timelineStore.compressor.threshold"
                    :min="-100"
                    :max="0"
                    thumb-size="small"
                    :disabled="!timelineStore.compressor.enabled"
                    :display-value="`${timelineStore.compressor.threshold}dB`"
                    @update:model-value="
                      (v) => timelineStore.updateCompressor({ threshold: v })
                    "
                  />
                </div>
                <div class="mini-slider">
                  <span class="mini-label">Ratio</span>
                  <RangeSlider
                    :model-value="timelineStore.compressor.ratio"
                    :min="1"
                    :max="20"
                    :step="0.5"
                    thumb-size="small"
                    :disabled="!timelineStore.compressor.enabled"
                    :display-value="`${timelineStore.compressor.ratio}:1`"
                    @update:model-value="
                      (v) => timelineStore.updateCompressor({ ratio: v })
                    "
                  />
                </div>
                <div class="mini-slider">
                  <span class="mini-label">Attack</span>
                  <RangeSlider
                    :model-value="timelineStore.compressor.attack"
                    :min="0"
                    :max="1"
                    :step="0.001"
                    thumb-size="small"
                    :disabled="!timelineStore.compressor.enabled"
                    :display-value="`${timelineStore.compressor.attack.toFixed(3)}s`"
                    @update:model-value="
                      (v) => timelineStore.updateCompressor({ attack: v })
                    "
                  />
                </div>
                <div class="mini-slider">
                  <span class="mini-label">Release</span>
                  <RangeSlider
                    :model-value="timelineStore.compressor.release"
                    :min="0"
                    :max="1"
                    :step="0.01"
                    thumb-size="small"
                    :disabled="!timelineStore.compressor.enabled"
                    :display-value="`${timelineStore.compressor.release.toFixed(2)}s`"
                    @update:model-value="
                      (v) => timelineStore.updateCompressor({ release: v })
                    "
                  />
                </div>
                <div class="mini-slider">
                  <span class="mini-label">Knee</span>
                  <RangeSlider
                    :model-value="timelineStore.compressor.knee"
                    :min="0"
                    :max="40"
                    thumb-size="small"
                    :disabled="!timelineStore.compressor.enabled"
                    :display-value="`${timelineStore.compressor.knee}dB`"
                    @update:model-value="
                      (v) => timelineStore.updateCompressor({ knee: v })
                    "
                  />
                </div>
              </div>
            </div>

            <div class="setting-group">
              <label class="setting-label">
                Limiteur
                <div class="toggle-switch">
                  <input
                    type="checkbox"
                    :checked="timelineStore.limiter.enabled"
                    @change="
                      timelineStore.updateLimiter({
                        enabled: ($event.target as HTMLInputElement).checked,
                      })
                    "
                  />
                </div>
              </label>
              <div class="compressor-controls">
                <div class="mini-slider">
                  <span class="mini-label">Threshold</span>
                  <RangeSlider
                    :model-value="timelineStore.limiter.threshold"
                    :min="-100"
                    :max="0"
                    thumb-size="small"
                    :disabled="!timelineStore.limiter.enabled"
                    :display-value="`${timelineStore.limiter.threshold}dB`"
                    @update:model-value="
                      (v) => timelineStore.updateLimiter({ threshold: v })
                    "
                  />
                </div>
                <div class="mini-slider">
                  <span class="mini-label">Release</span>
                  <RangeSlider
                    :model-value="timelineStore.limiter.release"
                    :min="0"
                    :max="1"
                    :step="0.01"
                    thumb-size="small"
                    :disabled="!timelineStore.limiter.enabled"
                    :display-value="`${timelineStore.limiter.release.toFixed(2)}s`"
                    @update:model-value="
                      (v) => timelineStore.updateLimiter({ release: v })
                    "
                  />
                </div>
              </div>
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

.toggle-switch input {
  cursor: pointer;
}

.compressor-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mini-slider {
  display: flex;
  align-items: center;
  gap: 10px;

  .mini-label {
    width: 60px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
  }
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
