<script setup lang="ts">
import { computed } from "vue";
import type { Track, OscillatorType } from "../../../lib/utils/types";
import { useTimelineStore } from "../../../stores/timelineStore";
import { useTrackAudioStore } from "../../../stores/trackAudioStore";
import { SOUNDFONT_LIST, UndertaleEngine } from "../../../lib/audio/engines";
import RangeSlider from "../../ui/RangeSlider.vue";
import EffectParamRow from "../effects/EffectParamRow.vue";
import EffectRack from "../effects/EffectRack.vue";
import BaseButton from "../../ui/BaseButton.vue";

const props = defineProps<{
  track: Track;
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const timelineStore = useTimelineStore();
const trackAudioStore = useTrackAudioStore();

const instrumentType = computed(() => props.track.instrument.type);

const currentOscillatorType = computed(() => {
  if (props.track.instrument.type === "basicSynth") {
    return props.track.instrument.oscillatorType;
  }
  return "sine";
});

const currentSoundfont = computed(() => {
  if (props.track.instrument.type === "smplr") {
    return props.track.instrument.soundfont;
  }
  return "";
});

const undertaleEngine = computed(() => {
  if (props.track.instrument.type !== "undertale") return null;
  const engine = trackAudioStore.getEngine(props.track.id);
  if (engine && engine instanceof UndertaleEngine) {
    return engine;
  }
  return null;
});

const undertaleInstruments = computed(() => {
  return undertaleEngine.value?.instrumentNames ?? [];
});

const currentUndertaleInstrument = computed(() => {
  if (props.track.instrument.type === "undertale") {
    return props.track.instrument.instrument;
  }
  return "";
});

const undertaleEngineState = computed(() => {
  return trackAudioStore.getTrackEngineState(props.track.id);
});

const undertaleAttack = computed(() => {
  if (props.track.instrument.type === "undertale") {
    return props.track.instrument.attack ?? 0;
  }
  return 0;
});

const undertaleDecay = computed(() => {
  if (props.track.instrument.type === "undertale") {
    return props.track.instrument.decay ?? 0;
  }
  return 0;
});

const undertaleSustain = computed(() => {
  if (props.track.instrument.type === "undertale") {
    return props.track.instrument.sustain ?? 1;
  }
  return 1;
});

const undertaleRelease = computed(() => {
  if (props.track.instrument.type === "undertale") {
    return props.track.instrument.release ?? 0.3;
  }
  return 0.3;
});

const oscillatorTypes: OscillatorType[] = [
  "sine",
  "square",
  "sawtooth",
  "triangle",
];

const handleOscillatorChange = (type: OscillatorType) => {
  timelineStore.updateTrackInstrument(props.track.id, { oscillatorType: type });
  trackAudioStore.updateTrackInstrument(props.track.id, {
    oscillatorType: type,
  });
};

const handleSoundfontChange = (soundfont: string) => {
  timelineStore.updateTrackInstrument(props.track.id, { soundfont });
  trackAudioStore.updateTrackInstrument(props.track.id, { soundfont });
};

const handleUndertaleInstrumentChange = (instrument: string) => {
  timelineStore.updateTrackInstrument(props.track.id, { instrument });
  trackAudioStore.updateTrackInstrument(props.track.id, { instrument });
};

const handleADSRChange = (
  param: "attack" | "decay" | "sustain" | "release",
  value: number,
) => {
  timelineStore.updateTrackInstrument(props.track.id, { [param]: value });
  trackAudioStore.updateTrackInstrument(props.track.id, { [param]: value });
};

const handleVolumeChange = (volume: number) => {
  timelineStore.setTrackVolume(props.track.id, volume);
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
            <h3>{{ track.name }}</h3>
            <BaseButton @click="handleClose" right-icon="fas fa-times" />
          </div>

          <div class="panel-body">
            <div class="setting-group">
              <EffectParamRow
                :track-id="track.id"
                effect-id="channel"
                param-id="volume"
                label="Volume"
                unit="%"
                :min="0"
                :max="100"
                :model-value="track.volume"
                @update:model-value="handleVolumeChange"
              />
            </div>

            <div class="setting-group">
              <label class="setting-label">Effets</label>
              <EffectRack :track-id="track.id" :effects="track.effects" />
            </div>

            <template v-if="instrumentType === 'basicSynth'">
              <div class="setting-group">
                <label class="setting-label">Forme d'onde</label>
                <div class="waveform-selector">
                  <button
                    v-for="waveform in oscillatorTypes"
                    :key="waveform"
                    class="waveform-btn"
                    :class="{
                      active: currentOscillatorType === waveform,
                    }"
                    @click="handleOscillatorChange(waveform)"
                  >
                    {{ waveform }}
                  </button>
                </div>
              </div>
            </template>

            <template v-else-if="instrumentType === 'smplr'">
              <div class="setting-group">
                <label class="setting-label">Instrument</label>
                <select
                  class="soundfont-select instrument-select"
                  :value="currentSoundfont"
                  @change="
                    handleSoundfontChange(
                      ($event.target as HTMLSelectElement).value,
                    )
                  "
                >
                  <option v-for="sf in SOUNDFONT_LIST" :key="sf" :value="sf">
                    {{ sf.replace(/_/g, " ") }}
                  </option>
                </select>
              </div>
            </template>

            <template v-else-if="instrumentType === 'undertale'">
              <div class="setting-group">
                <label class="setting-label">Preset Undertale</label>
                <template v-if="undertaleEngineState === 'loading'">
                  <p class="loading-text">Chargement du soundfont...</p>
                </template>
                <template v-else-if="undertaleInstruments.length > 0">
                  <select
                    class="soundfont-select instrument-select"
                    :value="currentUndertaleInstrument"
                    @change="
                      handleUndertaleInstrumentChange(
                        ($event.target as HTMLSelectElement).value,
                      )
                    "
                  >
                    <option
                      v-for="inst in undertaleInstruments"
                      :key="inst"
                      :value="inst"
                    >
                      {{ inst }}
                    </option>
                  </select>
                </template>
                <template v-else>
                  <p class="coming-soon">Aucun preset disponible</p>
                </template>
              </div>

              <div class="setting-group">
                <label class="setting-label">Enveloppe ADSR</label>
                <div class="adsr-controls">
                  <div class="adsr-slider">
                    <span class="adsr-label">A</span>
                    <RangeSlider
                      :model-value="undertaleAttack"
                      :min="0"
                      :max="2"
                      :step="0.01"
                      thumb-size="small"
                      :display-value="`${undertaleAttack.toFixed(2)}s`"
                      @update:model-value="
                        (value) => handleADSRChange('attack', value)
                      "
                    />
                  </div>
                  <div class="adsr-slider">
                    <span class="adsr-label">D</span>
                    <RangeSlider
                      :model-value="undertaleDecay"
                      :min="0"
                      :max="2"
                      :step="0.01"
                      thumb-size="small"
                      :display-value="`${undertaleDecay.toFixed(2)}s`"
                      @update:model-value="
                        (value) => handleADSRChange('decay', value)
                      "
                    />
                  </div>
                  <div class="adsr-slider">
                    <span class="adsr-label">S</span>
                    <RangeSlider
                      :model-value="undertaleSustain"
                      :min="0"
                      :max="1"
                      :step="0.01"
                      thumb-size="small"
                      :display-value="`${(undertaleSustain * 100).toFixed(0)}%`"
                      @update:model-value="
                        (value) => handleADSRChange('sustain', value)
                      "
                    />
                  </div>
                  <div class="adsr-slider">
                    <span class="adsr-label">R</span>
                    <RangeSlider
                      :model-value="undertaleRelease"
                      :min="0"
                      :max="3"
                      :step="0.01"
                      thumb-size="small"
                      :display-value="`${undertaleRelease.toFixed(2)}s`"
                      @update:model-value="
                        (value) => handleADSRChange('release', value)
                      "
                    />
                  </div>
                </div>
              </div>
            </template>

            <template v-else-if="instrumentType === 'elementarySynth'">
              <div class="setting-group">
                <p class="coming-soon">Paramètres ADSR à venir...</p>
              </div>
            </template>
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
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 8px;
}

.waveform-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.waveform-btn {
  padding: 10px;
  border: 1px solid var(--color-border-secondary);
  border-radius: 6px;
  background: var(--color-bg-primary-dark);
  color: var(--color-white);
  font-size: 13px;
  text-transform: capitalize;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--color-bg-daw-active);
    border-color: rgba(var(--color-accent3-rgb), 0.7);
  }

  &.active {
    background: var(--color-accent2);
    border-color: var(--color-accent2);
    color: var(--color-bg-primary-dark);
  }
}

.soundfont-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border-secondary);
  border-radius: 6px;
  background: var(--color-bg-primary-dark);
  color: var(--color-white);
  font-size: 13px;
  cursor: pointer;
  color-scheme: dark;

  &:focus {
    outline: none;
    border-color: var(--color-accent2);
  }

  option {
    background: var(--color-bg-secondary-dark);
    text-transform: capitalize;
  }
}

.coming-soon {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  font-style: italic;
}

.loading-text {
  font-size: 13px;
  color: var(--color-accent2);
  font-style: italic;
}

.adsr-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.adsr-slider {
  display: flex;
  align-items: center;
  gap: 10px;

  .adsr-label {
    width: 16px;
    font-size: 12px;
    font-weight: 700;
    color: var(--color-accent2);
    text-align: center;
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
