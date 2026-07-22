<script setup lang="ts">
import { computed, ref } from "vue";
import type { Dx7Operator, Dx7Patch, Track } from "../../../lib/utils/types";
import { useTimelineStore } from "../../../stores/timelineStore";
import { useTrackAudioStore } from "../../../stores/trackAudioStore";
import { ALGORITHMS, FM_SYNTH_PRESETS } from "../../../lib/audio/engines";
import RangeSlider from "../../ui/RangeSlider.vue";

const props = defineProps<{
  track: Track;
}>();

const timelineStore = useTimelineStore();
const trackAudioStore = useTrackAudioStore();

const patch = computed<Dx7Patch | null>(() =>
  props.track.instrument.type === "fmSynth"
    ? props.track.instrument.patch
    : null,
);

const activeOperatorIndex = ref(0);

const LFO_WAVEFORMS = [
  "Triangle",
  "Dent de scie ↓",
  "Dent de scie ↑",
  "Carré",
  "Sine",
  "S&H",
];

const updatePatch = (newPatch: Dx7Patch) => {
  timelineStore.updateTrackInstrument(props.track.id, { patch: newPatch });
  trackAudioStore.updateTrackInstrument(props.track.id, { patch: newPatch });
};

const updatePatchField = (changes: Partial<Dx7Patch>) => {
  if (!patch.value) return;
  updatePatch({ ...patch.value, ...changes });
};

const updateOperator = (idx: number, changes: Partial<Dx7Operator>) => {
  if (!patch.value) return;
  const operators = patch.value.operators.map((op, i) =>
    i === idx ? { ...op, ...changes } : op,
  );
  updatePatch({ ...patch.value, operators });
};

const updateOperatorStage = (
  idx: number,
  field: "rates" | "levels",
  stage: number,
  value: number,
) => {
  if (!patch.value) return;
  const op = patch.value.operators[idx];
  const stages = [...op[field]] as [number, number, number, number];
  stages[stage] = value;
  updateOperator(idx, { [field]: stages });
};

const selectPreset = (name: string) => {
  const preset = FM_SYNTH_PRESETS.find((p) => p.name === name);
  if (preset) updatePatch(structuredClone(preset));
};

const carrierOperators = computed(() => {
  if (!patch.value) return new Set<number>();
  return new Set(ALGORITHMS[patch.value.algorithm - 1].outputMix);
});

// Pour chaque opérateur modulateur, la liste des opérateurs qu'il alimente
// (inverse de modulationMatrix, qui est indexé par opérateur modulé).
const modulationTargets = computed(() => {
  const targets: number[][] = [[], [], [], [], [], []];
  if (!patch.value) return targets;
  const { modulationMatrix } = ALGORITHMS[patch.value.algorithm - 1];
  modulationMatrix.forEach((modulators, targetIdx) => {
    modulators.forEach((modulatorIdx) => {
      if (modulatorIdx !== targetIdx) targets[modulatorIdx].push(targetIdx);
    });
  });
  return targets;
});

const activeOperator = computed(
  () => patch.value?.operators[activeOperatorIndex.value],
);
</script>

<template>
  <div v-if="patch" class="dx7-panel">
    <div class="dx7-row">
      <label class="dx7-label">Preset</label>
      <select
        class="dx7-select"
        :value="patch.name"
        @change="selectPreset(($event.target as HTMLSelectElement).value)"
      >
        <option
          v-for="preset in FM_SYNTH_PRESETS"
          :key="preset.name"
          :value="preset.name"
        >
          {{ preset.name }}
        </option>
      </select>
    </div>

    <div class="dx7-row dx7-row--split">
      <div class="dx7-field">
        <label class="dx7-label">Algorithme</label>
        <input
          type="number"
          class="dx7-number"
          :value="patch.algorithm"
          min="1"
          max="32"
          @change="
            updatePatchField({
              algorithm: Number(($event.target as HTMLInputElement).value),
            })
          "
        />
      </div>
      <div class="dx7-field dx7-field--grow">
        <label class="dx7-label">Feedback</label>
        <RangeSlider
          :model-value="patch.feedback"
          :min="0"
          :max="7"
          thumb-size="small"
          :display-value="String(patch.feedback)"
          @update:model-value="(value) => updatePatchField({ feedback: value })"
        />
      </div>
    </div>

    <div class="dx7-diagram">
      <div
        v-for="opIdx in [5, 4, 3, 2, 1, 0]"
        :key="opIdx"
        class="dx7-diagram__op"
        :class="{ 'dx7-diagram__op--carrier': carrierOperators.has(opIdx) }"
      >
        <span class="dx7-diagram__num">{{ opIdx + 1 }}</span>
        <span v-if="carrierOperators.has(opIdx)" class="dx7-diagram__badge">
          <i class="fas fa-volume-high" />
        </span>
        <span v-if="modulationTargets[opIdx].length" class="dx7-diagram__arrow">
          → {{ modulationTargets[opIdx].map((t) => t + 1).join(", ") }}
        </span>
      </div>
    </div>

    <div class="dx7-row dx7-row--lfo">
      <div class="dx7-field">
        <label class="dx7-label">LFO</label>
        <select
          class="dx7-select"
          :value="patch.lfoWaveform"
          @change="
            updatePatchField({
              lfoWaveform: Number(($event.target as HTMLSelectElement).value),
            })
          "
        >
          <option v-for="(name, idx) in LFO_WAVEFORMS" :key="idx" :value="idx">
            {{ name }}
          </option>
        </select>
      </div>
      <div class="dx7-field dx7-field--grow">
        <label class="dx7-label">Vitesse</label>
        <RangeSlider
          :model-value="patch.lfoSpeed"
          :min="0"
          :max="99"
          thumb-size="small"
          @update:model-value="(value) => updatePatchField({ lfoSpeed: value })"
        />
      </div>
      <div class="dx7-field dx7-field--grow">
        <label class="dx7-label">Délai</label>
        <RangeSlider
          :model-value="patch.lfoDelay"
          :min="0"
          :max="99"
          thumb-size="small"
          @update:model-value="(value) => updatePatchField({ lfoDelay: value })"
        />
      </div>
      <div class="dx7-field dx7-field--grow">
        <label class="dx7-label">Pitch mod</label>
        <RangeSlider
          :model-value="patch.lfoPitchModDepth"
          :min="0"
          :max="99"
          thumb-size="small"
          @update:model-value="
            (value) => updatePatchField({ lfoPitchModDepth: value })
          "
        />
      </div>
      <div class="dx7-field dx7-field--grow">
        <label class="dx7-label">Amp mod</label>
        <RangeSlider
          :model-value="patch.lfoAmpModDepth"
          :min="0"
          :max="99"
          thumb-size="small"
          @update:model-value="
            (value) => updatePatchField({ lfoAmpModDepth: value })
          "
        />
      </div>
    </div>

    <div class="dx7-op-tabs">
      <button
        v-for="op in patch.operators"
        :key="op.idx"
        class="dx7-op-tab"
        :class="{
          active: activeOperatorIndex === op.idx,
          disabled: !op.enabled,
        }"
        @click="activeOperatorIndex = op.idx"
      >
        OP{{ op.idx + 1 }}
      </button>
    </div>

    <div v-if="activeOperator" class="dx7-operator">
      <div class="dx7-row dx7-row--split">
        <label class="dx7-checkbox">
          <input
            type="checkbox"
            :checked="activeOperator.enabled"
            @change="
              updateOperator(activeOperatorIndex, {
                enabled: ($event.target as HTMLInputElement).checked,
              })
            "
          />
          Actif
        </label>
        <div class="dx7-mode-selector">
          <button
            class="dx7-mode-btn"
            :class="{ active: activeOperator.oscMode === 0 }"
            @click="updateOperator(activeOperatorIndex, { oscMode: 0 })"
          >
            Ratio
          </button>
          <button
            class="dx7-mode-btn"
            :class="{ active: activeOperator.oscMode === 1 }"
            @click="updateOperator(activeOperatorIndex, { oscMode: 1 })"
          >
            Fixe
          </button>
        </div>
      </div>

      <div class="dx7-row dx7-row--split">
        <div class="dx7-field dx7-field--grow">
          <label class="dx7-label">Niveau</label>
          <RangeSlider
            :model-value="activeOperator.volume"
            :min="0"
            :max="99"
            thumb-size="small"
            @update:model-value="
              (value) => updateOperator(activeOperatorIndex, { volume: value })
            "
          />
        </div>
        <div class="dx7-field dx7-field--grow">
          <label class="dx7-label">Detune</label>
          <RangeSlider
            :model-value="activeOperator.detune"
            :min="-7"
            :max="7"
            thumb-size="small"
            @update:model-value="
              (value) => updateOperator(activeOperatorIndex, { detune: value })
            "
          />
        </div>
      </div>

      <div class="dx7-row dx7-row--split">
        <div class="dx7-field dx7-field--grow">
          <label class="dx7-label">Coarse</label>
          <RangeSlider
            :model-value="activeOperator.freqCoarse"
            :min="0"
            :max="31"
            thumb-size="small"
            @update:model-value="
              (value) =>
                updateOperator(activeOperatorIndex, { freqCoarse: value })
            "
          />
        </div>
        <div class="dx7-field dx7-field--grow">
          <label class="dx7-label">Fine</label>
          <RangeSlider
            :model-value="activeOperator.freqFine"
            :min="0"
            :max="99"
            thumb-size="small"
            @update:model-value="
              (value) =>
                updateOperator(activeOperatorIndex, { freqFine: value })
            "
          />
        </div>
        <div class="dx7-field dx7-field--grow">
          <label class="dx7-label">Pan</label>
          <RangeSlider
            :model-value="activeOperator.pan"
            :min="-50"
            :max="50"
            thumb-size="small"
            @update:model-value="
              (value) => updateOperator(activeOperatorIndex, { pan: value })
            "
          />
        </div>
      </div>

      <div class="dx7-row dx7-row--split">
        <div class="dx7-field dx7-field--grow">
          <label class="dx7-label">Vel. sens</label>
          <RangeSlider
            :model-value="activeOperator.velocitySens"
            :min="0"
            :max="7"
            thumb-size="small"
            @update:model-value="
              (value) =>
                updateOperator(activeOperatorIndex, { velocitySens: value })
            "
          />
        </div>
        <div class="dx7-field dx7-field--grow">
          <label class="dx7-label">LFO amp sens</label>
          <RangeSlider
            :model-value="activeOperator.lfoAmpModSens"
            :min="0"
            :max="3"
            thumb-size="small"
            @update:model-value="
              (value) =>
                updateOperator(activeOperatorIndex, { lfoAmpModSens: value })
            "
          />
        </div>
      </div>

      <div class="dx7-eg">
        <label class="dx7-label">Enveloppe (Rate / Level)</label>
        <div class="dx7-eg-grid">
          <div v-for="stage in [0, 1, 2, 3]" :key="stage" class="dx7-eg-stage">
            <span class="dx7-eg-stage-label">{{ stage + 1 }}</span>
            <RangeSlider
              :model-value="activeOperator.rates[stage]"
              :min="0"
              :max="99"
              thumb-size="small"
              @update:model-value="
                (value) =>
                  updateOperatorStage(
                    activeOperatorIndex,
                    'rates',
                    stage,
                    value,
                  )
              "
            />
            <RangeSlider
              :model-value="activeOperator.levels[stage]"
              :min="0"
              :max="99"
              thumb-size="small"
              @update:model-value="
                (value) =>
                  updateOperatorStage(
                    activeOperatorIndex,
                    'levels',
                    stage,
                    value,
                  )
              "
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dx7-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dx7-row {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &--split {
    flex-direction: row;
    align-items: flex-end;
    gap: 16px;
  }

  &--lfo {
    flex-wrap: wrap;
  }
}

.dx7-field {
  display: flex;
  flex-direction: column;
  gap: 4px;

  &--grow {
    flex: 1;
    min-width: 90px;
  }
}

.dx7-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.6);
}

.dx7-select,
.dx7-number {
  padding: 8px 10px;
  border: 1px solid var(--color-border-secondary);
  border-radius: 6px;
  background: var(--color-bg-primary-dark);
  color: var(--color-white);
  font-size: 13px;
  color-scheme: dark;

  &:focus {
    outline: none;
    border-color: var(--color-accent2);
  }
}

.dx7-number {
  width: 70px;
}

.dx7-diagram {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px;
  border-radius: 6px;
  background: var(--color-bg-primary-dark);
}

.dx7-diagram__op {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  background: var(--color-bg-secondary-dark);

  &--carrier {
    color: var(--color-white);
    border: 1px solid var(--color-accent2);
  }
}

.dx7-diagram__num {
  font-weight: 700;
}

.dx7-diagram__badge {
  color: var(--color-accent2);
}

.dx7-op-tabs {
  display: flex;
  gap: 4px;
}

.dx7-op-tab {
  flex: 1;
  padding: 8px 4px;
  border: 1px solid var(--color-border-secondary);
  border-radius: 6px;
  background: var(--color-bg-primary-dark);
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  cursor: pointer;

  &.active {
    background: var(--color-accent2);
    border-color: var(--color-accent2);
    color: var(--color-bg-primary-dark);
  }

  &.disabled {
    opacity: 0.4;
  }
}

.dx7-operator {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 12px;
  border: 1px solid var(--color-border-secondary);
  border-radius: 8px;
}

.dx7-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-white);
}

.dx7-mode-selector {
  display: flex;
  gap: 6px;
}

.dx7-mode-btn {
  padding: 6px 12px;
  border: 1px solid var(--color-border-secondary);
  border-radius: 6px;
  background: var(--color-bg-primary-dark);
  color: var(--color-white);
  font-size: 12px;
  cursor: pointer;

  &.active {
    background: var(--color-accent2);
    border-color: var(--color-accent2);
    color: var(--color-bg-primary-dark);
  }
}

.dx7-eg {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dx7-eg-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.dx7-eg-stage {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.dx7-eg-stage-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}
</style>
