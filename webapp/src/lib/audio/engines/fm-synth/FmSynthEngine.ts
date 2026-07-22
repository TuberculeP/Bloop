import type {
  FmSynthConfig,
  InstrumentConfigUpdate,
  NoteName,
} from "../../../utils/types";
import { BaseEngine } from "../BaseEngine";
import { noteNameToMidiNote } from "../noteUtils";
import type { FmSynthMessageToProcessor } from "./protocol";
import fmSynthProcessorUrl from "./fm-synth-processor.ts?worker&url";

const PROCESSOR_NAME = "fm-synth-processor";

export class FmSynthEngine extends BaseEngine {
  readonly type = "fmSynth";
  readonly resourceKey = "fm-synth:worklet";
  readonly resourceLabel = "FM Synth";

  private workletNode: AudioWorkletNode | null = null;
  private outputNode: GainNode;
  private loadPromise: Promise<void> | null = null;
  private patch: FmSynthConfig["patch"];

  constructor(
    audioContext: AudioContext,
    destination: AudioNode,
    config: FmSynthConfig,
  ) {
    super(audioContext, destination, config);
    this.patch = config.patch;
    this.outputNode = audioContext.createGain();
    this.outputNode.gain.value = config.gain ?? 1;
    this.outputNode.connect(destination);
  }

  async preload(): Promise<void> {
    if (this._state === "ready") return;
    if (this._state === "loading" && this.loadPromise) {
      await this.loadPromise;
      return;
    }
    this.loadPromise = this.setup();
    await this.loadPromise;
  }

  private async setup(): Promise<void> {
    this.setState("loading");
    try {
      await this.audioContext.audioWorklet.addModule(fmSynthProcessorUrl);

      const node = new AudioWorkletNode(this.audioContext, PROCESSOR_NAME, {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [2],
      });
      node.connect(this.outputNode);
      this.workletNode = node;

      this.postMessage({ type: "loadPatch", patch: this.patch });

      this.setState("ready");
    } catch (error) {
      console.error("[FmSynthEngine] Failed to initialize worklet:", error);
      this.setState("error");
    }
  }

  private postMessage(message: FmSynthMessageToProcessor): void {
    this.workletNode?.port.postMessage(message);
  }

  playNote(noteName: NoteName, noteId: string, velocity: number = 100): void {
    if (this._state !== "ready") {
      this.preload().then(() => {
        if (this._state === "ready")
          this.playNoteInternal(noteName, noteId, velocity);
      });
      return;
    }
    this.playNoteInternal(noteName, noteId, velocity);
  }

  private playNoteInternal(
    noteName: NoteName,
    noteId: string,
    velocity: number,
  ): void {
    this.postMessage({
      type: "noteOn",
      noteId,
      note: noteNameToMidiNote(noteName),
      velocity: velocity / 127,
    });
  }

  stopNote(noteId: string): void {
    this.postMessage({ type: "noteOff", noteId });
  }

  stopAllNotes(): void {
    this.postMessage({ type: "panic" });
  }

  updateConfig(config: InstrumentConfigUpdate): void {
    if (config.patch) {
      this.patch = config.patch;
      this.postMessage({ type: "loadPatch", patch: config.patch });
    }
    if (config.gain !== undefined) {
      this.outputNode.gain.setValueAtTime(
        config.gain,
        this.audioContext.currentTime,
      );
    }
    this.config = { ...this.config, ...config } as FmSynthConfig;
  }

  dispose(): void {
    this.stopAllNotes();
    this.workletNode?.disconnect();
    this.workletNode = null;
    this.outputNode.disconnect();
    this.loadPromise = null;
    this.stateCallbacks.clear();
    this._state = "idle";
  }
}
