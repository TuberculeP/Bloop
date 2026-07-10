<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { useVoiceRecorder } from "../../../composables/useVoiceRecorder";
import BaseButton from "../../ui/BaseButton.vue";

const props = defineProps<{
  submitting?: boolean;
  submitError?: string | null;
}>();

const emit = defineEmits<{
  (e: "confirm", blob: Blob): void;
  (e: "close"): void;
}>();

const {
  isSupported,
  state,
  elapsedMs,
  level,
  error,
  previewUrl,
  lastBlob,
  devices,
  selectedDeviceId,
  start,
  stop,
  reset,
  requestPermission,
} = useVoiceRecorder();

const deviceLabel = (device: MediaDeviceInfo, index: number): string =>
  device.label || `Microphone ${index + 1}`;

onMounted(() => {
  requestPermission();
});

const formattedTime = computed(() => {
  const totalSeconds = Math.floor(elapsedMs.value / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
});

const levelBarStyle = computed(() => ({
  transform: `scaleX(${Math.max(0.03, level.value)})`,
}));

const handleStart = () => start();
const handleStop = () => stop();
const handleRedo = () => reset();

const handleConfirm = () => {
  if (lastBlob.value) {
    emit("confirm", lastBlob.value);
  }
};

const handleClose = () => {
  if (props.submitting) return;
  reset();
  emit("close");
};

onBeforeUnmount(() => {
  reset();
});
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click="handleClose">
      <div class="modal voice-modal" @click.stop>
        <h3><i class="fas fa-microphone"></i> Enregistrer ma voix</h3>

        <div v-if="!isSupported" class="voice-error">
          L'enregistrement audio n'est pas supporté par ce navigateur.
        </div>

        <template v-else>
          <div v-if="error" class="voice-error">{{ error }}</div>

          <div
            v-if="devices.length > 0 && (state === 'idle' || state === 'error')"
            class="mic-select-wrapper"
          >
            <label for="mic-select">Microphone</label>
            <select
              id="mic-select"
              v-model="selectedDeviceId"
              class="mic-select"
            >
              <option
                v-for="(device, index) in devices"
                :key="device.deviceId"
                :value="device.deviceId"
              >
                {{ deviceLabel(device, index) }}
              </option>
            </select>
          </div>

          <div class="voice-stage">
            <div v-if="state === 'recording'" class="level-meter">
              <div class="level-meter-fill" :style="levelBarStyle" />
            </div>

            <div class="voice-timer" :class="{ active: state === 'recording' }">
              {{ formattedTime }}
            </div>

            <button
              v-if="state === 'idle' || state === 'error'"
              class="record-btn"
              :disabled="submitting"
              @click="handleStart"
              title="Démarrer l'enregistrement"
            >
              <i class="fas fa-microphone"></i>
            </button>

            <button
              v-else-if="state === 'recording'"
              class="record-btn recording"
              @click="handleStop"
              title="Arrêter l'enregistrement"
            >
              <i class="fas fa-stop"></i>
            </button>

            <div v-else-if="state === 'stopped'" class="preview-block">
              <audio
                v-if="previewUrl"
                :src="previewUrl"
                controls
                class="preview-audio"
              />
            </div>
          </div>

          <div v-if="submitError" class="voice-error">{{ submitError }}</div>
        </template>

        <div class="modal-actions">
          <BaseButton
            variant="secondary"
            :disabled="submitting"
            @click="handleClose"
          >
            Annuler
          </BaseButton>
          <BaseButton
            v-if="state === 'stopped'"
            variant="ghost"
            :disabled="submitting"
            @click="handleRedo"
          >
            Recommencer
          </BaseButton>
          <BaseButton
            v-if="state === 'stopped'"
            variant="error"
            :loading="submitting"
            @click="handleConfirm"
          >
            Ajouter à la piste
          </BaseButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: var(--color-bg-secondary-dark);
  border: 1px solid var(--color-border-secondary);
  border-radius: 16px;
  padding: 32px;
  max-width: 420px;
  width: 90%;

  h3 {
    color: var(--color-white);
    font-size: 1.25rem;
    margin: 0 0 12px;
  }
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.voice-modal {
  max-width: 380px;

  h3 {
    display: flex;
    align-items: center;
    gap: 10px;
  }
}

.voice-error {
  color: var(--color-error);
  font-size: 0.85rem;
  margin-bottom: 12px;
}

.mic-select-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;

  label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-white-light);
  }
}

.mic-select {
  width: 100%;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid var(--color-border-secondary);
  background: var(--color-bg-primary-dark);
  color: var(--color-white);
  font-size: 0.85rem;

  &:focus {
    outline: none;
    border-color: #ff3fb4;
  }
}

.voice-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 12px 0 20px;
}

.voice-timer {
  font-size: 1.5rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-white-light);

  &.active {
    color: #ff3fb4;
  }
}

.level-meter {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.level-meter-fill {
  height: 100%;
  width: 100%;
  background: #ff3fb4;
  transform-origin: left;
  transition: transform 0.05s linear;
}

.record-btn {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: none;
  background: #ff3fb4;
  color: var(--color-white);
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: scale(1.03);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.recording {
    background: var(--color-error);
    animation: pulse 1.4s ease-in-out infinite;
  }
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
  }
}

.preview-block {
  width: 100%;
}

.preview-audio {
  width: 100%;
}
</style>
