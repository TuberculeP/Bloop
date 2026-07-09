<script setup lang="ts">
import { useTimelineStore } from "../../../stores/timelineStore";
import TrackEqualizer from "./TrackEqualizer.vue";

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
              <div class="slider-control">
                <input
                  type="range"
                  :value="timelineStore.volume"
                  min="0"
                  max="100"
                  @input="
                    handleVolumeChange(
                      Number(($event.target as HTMLInputElement).value),
                    )
                  "
                />
                <span class="slider-value">{{ timelineStore.volume }}%</span>
              </div>
            </div>

            <div class="setting-group">
              <label class="setting-label">Reverb</label>
              <div class="slider-control">
                <input
                  type="range"
                  :value="timelineStore.reverb"
                  min="0"
                  max="100"
                  @input="
                    handleReverbChange(
                      Number(($event.target as HTMLInputElement).value),
                    )
                  "
                />
                <span class="slider-value">{{ timelineStore.reverb }}%</span>
              </div>
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
              <div
                class="compressor-controls"
                :class="{ disabled: !timelineStore.compressor.enabled }"
              >
                <div class="mini-slider">
                  <span class="mini-label">Threshold</span>
                  <input
                    type="range"
                    :value="timelineStore.compressor.threshold"
                    min="-100"
                    max="0"
                    :disabled="!timelineStore.compressor.enabled"
                    @input="
                      timelineStore.updateCompressor({
                        threshold: Number(
                          ($event.target as HTMLInputElement).value,
                        ),
                      })
                    "
                  />
                  <span class="mini-value"
                    >{{ timelineStore.compressor.threshold }}dB</span
                  >
                </div>
                <div class="mini-slider">
                  <span class="mini-label">Ratio</span>
                  <input
                    type="range"
                    :value="timelineStore.compressor.ratio"
                    min="1"
                    max="20"
                    step="0.5"
                    :disabled="!timelineStore.compressor.enabled"
                    @input="
                      timelineStore.updateCompressor({
                        ratio: Number(
                          ($event.target as HTMLInputElement).value,
                        ),
                      })
                    "
                  />
                  <span class="mini-value"
                    >{{ timelineStore.compressor.ratio }}:1</span
                  >
                </div>
                <div class="mini-slider">
                  <span class="mini-label">Attack</span>
                  <input
                    type="range"
                    :value="timelineStore.compressor.attack"
                    min="0"
                    max="1"
                    step="0.001"
                    :disabled="!timelineStore.compressor.enabled"
                    @input="
                      timelineStore.updateCompressor({
                        attack: Number(
                          ($event.target as HTMLInputElement).value,
                        ),
                      })
                    "
                  />
                  <span class="mini-value"
                    >{{ timelineStore.compressor.attack.toFixed(3) }}s</span
                  >
                </div>
                <div class="mini-slider">
                  <span class="mini-label">Release</span>
                  <input
                    type="range"
                    :value="timelineStore.compressor.release"
                    min="0"
                    max="1"
                    step="0.01"
                    :disabled="!timelineStore.compressor.enabled"
                    @input="
                      timelineStore.updateCompressor({
                        release: Number(
                          ($event.target as HTMLInputElement).value,
                        ),
                      })
                    "
                  />
                  <span class="mini-value"
                    >{{ timelineStore.compressor.release.toFixed(2) }}s</span
                  >
                </div>
                <div class="mini-slider">
                  <span class="mini-label">Knee</span>
                  <input
                    type="range"
                    :value="timelineStore.compressor.knee"
                    min="0"
                    max="40"
                    :disabled="!timelineStore.compressor.enabled"
                    @input="
                      timelineStore.updateCompressor({
                        knee: Number(($event.target as HTMLInputElement).value),
                      })
                    "
                  />
                  <span class="mini-value"
                    >{{ timelineStore.compressor.knee }}dB</span
                  >
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
              <div
                class="compressor-controls"
                :class="{ disabled: !timelineStore.limiter.enabled }"
              >
                <div class="mini-slider">
                  <span class="mini-label">Threshold</span>
                  <input
                    type="range"
                    :value="timelineStore.limiter.threshold"
                    min="-100"
                    max="0"
                    :disabled="!timelineStore.limiter.enabled"
                    @input="
                      timelineStore.updateLimiter({
                        threshold: Number(
                          ($event.target as HTMLInputElement).value,
                        ),
                      })
                    "
                  />
                  <span class="mini-value"
                    >{{ timelineStore.limiter.threshold }}dB</span
                  >
                </div>
                <div class="mini-slider">
                  <span class="mini-label">Release</span>
                  <input
                    type="range"
                    :value="timelineStore.limiter.release"
                    min="0"
                    max="1"
                    step="0.01"
                    :disabled="!timelineStore.limiter.enabled"
                    @input="
                      timelineStore.updateLimiter({
                        release: Number(
                          ($event.target as HTMLInputElement).value,
                        ),
                      })
                    "
                  />
                  <span class="mini-value"
                    >{{ timelineStore.limiter.release.toFixed(2) }}s</span
                  >
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
  background: #2d0f20;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(122, 15, 62, 0.5);

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #f2efe8;
  }
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 20px;
  cursor: pointer;

  &:hover {
    background: #7a0f3e;
    color: #f2efe8;
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

.slider-control {
  display: flex;
  align-items: center;
  gap: 12px;

  input[type="range"] {
    flex: 1;
    height: 6px;
    -webkit-appearance: none;
    background: #7a0f3e;
    border-radius: 3px;

    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      background: #ff3fb4;
      border-radius: 50%;
      cursor: pointer;
    }
  }

  .slider-value {
    font-size: 13px;
    color: #f2efe8;
    min-width: 45px;
    text-align: right;
  }
}

.compressor-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;

  &.disabled {
    opacity: 0.4;
  }
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

  input[type="range"] {
    flex: 1;
    height: 5px;
    -webkit-appearance: none;
    background: #7a0f3e;
    border-radius: 3px;

    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 13px;
      height: 13px;
      background: #ff3fb4;
      border-radius: 50%;
      cursor: pointer;
    }
  }

  .mini-value {
    min-width: 55px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7);
    text-align: right;
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
</style>
