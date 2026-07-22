import type { EffectInstanceConfig, TimeSignature } from "../../utils/types";
import { createEffectInstance } from "./registry";
import type { EffectInstance, EffectParamDescriptor } from "./types";

const BYPASS_SMOOTH_TIME = 0.01;

interface EffectSlot {
  config: EffectInstanceConfig;
  instance: EffectInstance;
  input: AudioNode;
  output: AudioNode;
  setEnabled(enabled: boolean): void;
  dispose(): void;
}

function createEffectSlot(
  ctx: AudioContext,
  config: EffectInstanceConfig,
): EffectSlot {
  const instance = createEffectInstance(
    ctx,
    config.type,
    config.id,
    config.params,
  );
  const slotInput = ctx.createGain();
  const slotOutput = ctx.createGain();
  const wetGain = ctx.createGain(); // 1 quand l'effet est actif
  const dryGain = ctx.createGain(); // 1 quand bypass

  slotInput.connect(wetGain).connect(instance.input);
  instance.output.connect(slotOutput);
  slotInput.connect(dryGain).connect(slotOutput); // passthrough direct

  const setEnabled = (enabled: boolean) => {
    const now = ctx.currentTime;
    wetGain.gain.setTargetAtTime(enabled ? 1 : 0, now, BYPASS_SMOOTH_TIME);
    dryGain.gain.setTargetAtTime(enabled ? 0 : 1, now, BYPASS_SMOOTH_TIME);
  };
  setEnabled(config.enabled);

  return {
    config,
    instance,
    input: slotInput,
    output: slotOutput,
    setEnabled,
    dispose() {
      instance.dispose();
      slotInput.disconnect();
      wetGain.disconnect();
      dryGain.disconnect();
      slotOutput.disconnect();
    },
  };
}

/**
 * Chaîne d'effets réordonnable partagée par les pistes et le bus master.
 * `rebuild` ne doit être appelé que sur ajout/suppression/réordre/bypass —
 * pas à chaque frame ni à chaque changement de valeur de param (voir
 * trackAudioStore.ts/audioBusStore.ts, qui scindent leurs watchers en
 * conséquence).
 */
// Champs volontairement publics (pas `private`) : une classe avec des
// membres privés imbriquée dans un `ref<Map<...>>` casse l'inférence de type
// de la réactivité Vue/Pinia (UnwrapRef mappe sur les clés de la classe et
// perd la comparaison structurelle). Usage interne uniquement malgré tout.
export class EffectChain {
  slots: EffectSlot[] = [];

  constructor(
    public ctx: AudioContext,
    public input: AudioNode,
    public output: AudioNode,
  ) {}

  rebuild(configs: EffectInstanceConfig[]): void {
    const nextIds = new Set(configs.map((c) => c.id));
    this.slots = this.slots.filter((slot) => {
      if (nextIds.has(slot.config.id)) return true;
      slot.dispose();
      return false;
    });

    for (const config of configs) {
      if (!this.slots.some((slot) => slot.config.id === config.id)) {
        this.slots.push(createEffectSlot(this.ctx, config));
      }
    }

    // Réordonne selon `configs`, puis reconnecte tout depuis zéro : .connect()/
    // .disconnect() sont quasi gratuits en Web Audio et ce rebuild est rare
    // (pas à chaque frame) — un brute-force est plus simple et moins sujet aux
    // bugs qu'un diff fin des connexions.
    this.slots = configs.map((config) =>
      this.slots.find((slot) => slot.config.id === config.id)!,
    );

    // Réapplique enabled/bypass à CHAQUE rebuild, pas seulement à la création
    // du slot : un effet déjà existant dont on bascule juste le bypass ne
    // doit pas rester figé sur son état de création (`createEffectSlot` ne le
    // réappelle jamais tout seul).
    this.slots.forEach((slot, i) => slot.setEnabled(configs[i].enabled));

    // Ne déconnecter QUE ce qui relie les slots entre eux (this.input et la
    // sortie de chaque slot) : slot.input a un câblage interne permanent posé
    // une seule fois dans createEffectSlot (-> wetGain/dryGain), le
    // déconnecter ici couperait le bypass en silence total dès le premier
    // rebuild.
    this.input.disconnect();
    this.slots.forEach((slot) => {
      slot.output.disconnect();
    });

    let prev: AudioNode = this.input;
    for (const slot of this.slots) {
      prev.connect(slot.input);
      prev = slot.output;
    }
    prev.connect(this.output);
  }

  setEnabled(effectId: string, enabled: boolean): void {
    this.slots.find((slot) => slot.config.id === effectId)?.setEnabled(enabled);
  }

  // Franchissement de croche (résolution la plus fine utile aux effets
  // synchronisés au tempo, ex: Bloopy Pump) — voir
  // maybeTriggerBloopyPumpEffects dans useTimelinePlaybackEngine.ts. Un effet
  // bypassé ne doit pas se retrigger silencieusement en coulisses.
  notifyBeatBoundary(
    tick: number,
    timeSignature: TimeSignature,
    tempo: number,
  ): void {
    for (const slot of this.slots) {
      if (!slot.config.enabled) continue;
      slot.instance.onBeatBoundary?.(tick, timeSignature, tempo);
    }
  }

  getParamDescriptor(
    effectId: string,
    paramId: string,
  ): EffectParamDescriptor | undefined {
    return this.slots
      .find((slot) => slot.config.id === effectId)
      ?.instance.getParam(paramId);
  }

  dispose(): void {
    this.slots.forEach((slot) => slot.dispose());
    this.slots = [];
  }
}
