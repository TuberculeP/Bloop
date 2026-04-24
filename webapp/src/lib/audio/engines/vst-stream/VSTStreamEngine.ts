import type { VSTStreamConfig, InstrumentConfig, NoteName } from "../../../utils/types";
import { BaseEngine } from "../BaseEngine";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function noteNameToMidi(noteName: NoteName): number {
  const match = noteName.match(/^([A-G]#?)(\d+)$/);
  if (!match) return 60;
  const [, note, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  return (octave + 1) * 12 + NOTE_NAMES.indexOf(note);
}

const WORKLET_CODE = `
  class VSTStreamProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      this.bufferSize = 8192;
      this.buffer = new Float32Array(this.bufferSize);
      this.writeIndex = 0;
      this.readIndex = 0;
      this.bufferedSamples = 0;
      this.minBufferThreshold = 1024;
      this.isBuffering = true;

      this.port.onmessage = (event) => {
        const samples = event.data.samples;
        for (let i = 0; i < samples.length; i++) {
          this.buffer[this.writeIndex] = samples[i];
          this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
          this.bufferedSamples = Math.min(this.bufferedSamples + 1, this.bufferSize);
        }
        if (this.isBuffering && this.bufferedSamples >= this.minBufferThreshold) {
          this.isBuffering = false;
        }
      };
    }

    process(inputs, outputs) {
      const output = outputs[0];
      const frameCount = output[0]?.length || 128;

      if (this.isBuffering) {
        for (const channel of output) channel.fill(0);
        return true;
      }

      for (let i = 0; i < frameCount; i++) {
        const sample = this.bufferedSamples > 0 ? this.buffer[this.readIndex] : 0;
        if (this.bufferedSamples > 0) {
          this.readIndex = (this.readIndex + 1) % this.bufferSize;
          this.bufferedSamples--;
        }
        for (const channel of output) channel[i] = sample;
      }

      if (this.bufferedSamples < 128) {
        this.isBuffering = true;
      }

      return true;
    }
  }
  registerProcessor('vst-stream-processor', VSTStreamProcessor);
`;

export class VSTStreamEngine extends BaseEngine {
  readonly type = "vstStream";

  private ws: WebSocket | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private isWorkletReady = false;
  private activeNotes = new Map<string, number>();
  private loadPromise: Promise<void> | null = null;

  private vstId: string;
  private serverUrl: string;
  private preset: string | undefined;
  private sessionId: string;

  constructor(
    audioContext: AudioContext,
    destination: AudioNode,
    config: VSTStreamConfig,
  ) {
    super(audioContext, destination, config);
    this.vstId = config.vstId;
    this.serverUrl = config.serverUrl;
    this.preset = config.preset;
    this.sessionId = crypto.randomUUID();
  }

  get resourceKey(): string {
    return `vstStream:${this.serverUrl}:${this.vstId}`;
  }

  get resourceLabel(): string {
    return `VST: ${this.vstId}`;
  }

  async preload(): Promise<void> {
    if (this._state === "ready") return;
    if (this._state === "loading" && this.loadPromise) {
      await this.loadPromise;
      return;
    }
    this.loadPromise = this._connect();
    await this.loadPromise;
  }

  private async _connect(): Promise<void> {
    this.setState("loading");
    try {
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }
      await this._setupWorklet();
      await this._connectWs();
      this.setState("ready");
    } catch (error) {
      console.error("[VSTStreamEngine] Connection failed:", error);
      this.setState("error");
      throw error;
    }
  }

  private async _setupWorklet(): Promise<void> {
    try {
      const blob = new Blob([WORKLET_CODE], { type: "application/javascript" });
      const url = URL.createObjectURL(blob);
      await this.audioContext.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);

      this.audioWorkletNode = new AudioWorkletNode(
        this.audioContext,
        "vst-stream-processor",
      );
      this.audioWorkletNode.connect(this.destination);
      this.isWorkletReady = true;
    } catch (error) {
      console.warn("[VSTStreamEngine] AudioWorklet setup failed:", error);
      this.isWorkletReady = false;
    }
  }

  private async _connectWs(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("WebSocket connection timeout")),
        10000,
      );

      this.ws = new WebSocket(this.serverUrl);
      this.ws.binaryType = "arraybuffer";

      this.ws.onopen = () => {
        clearTimeout(timeout);
        this._send({
          type: "load_vst",
          vstId: this.vstId,
          sessionId: this.sessionId,
          preset: this.preset,
        });
        resolve();
      };

      this.ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          this._handleAudio(event.data);
        } else {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "error") {
              console.error("[VSTStreamEngine] Server error:", msg.message);
              this.setState("error");
            }
          } catch {
            // ignore
          }
        }
      };

      this.ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };

      this.ws.onclose = () => {
        if (this._state === "ready") this.setState("idle");
      };
    });
  }

  private _handleAudio(data: ArrayBuffer): void {
    if (!this.isWorkletReady || !this.audioWorkletNode) return;
    const samples = new Float32Array(data);
    this.audioWorkletNode.port.postMessage({ samples: Array.from(samples) });
  }

  private _send(msg: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  playNote(noteName: NoteName, noteId: string, velocity = 100): void {
    if (this._state !== "ready") {
      this.preload().then(() => {
        if (this._state === "ready") this._playNoteNow(noteName, noteId, velocity);
      });
      return;
    }
    this._playNoteNow(noteName, noteId, velocity);
  }

  private _playNoteNow(
    noteName: NoteName,
    noteId: string,
    velocity: number,
  ): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    if (this.activeNotes.has(noteId)) this.stopNote(noteId);

    const note = noteNameToMidi(noteName);
    this.activeNotes.set(noteId, note);
    this._send({
      type: "note_on",
      vstId: this.vstId,
      sessionId: this.sessionId,
      note,
      velocity: Math.max(0, Math.min(127, Math.round(velocity))),
      channel: 0,
    });
  }

  stopNote(noteId: string): void {
    const note = this.activeNotes.get(noteId);
    if (note === undefined) return;
    this.activeNotes.delete(noteId);
    this._send({
      type: "note_off",
      vstId: this.vstId,
      sessionId: this.sessionId,
      note,
      channel: 0,
    });
  }

  stopAllNotes(): void {
    for (const noteId of [...this.activeNotes.keys()]) {
      this.stopNote(noteId);
    }
  }

  updateConfig(config: Partial<InstrumentConfig>): void {
    const update = config as Partial<VSTStreamConfig>;
    let reconnect = false;

    if (update.vstId && update.vstId !== this.vstId) {
      this.vstId = update.vstId;
      reconnect = true;
    }
    if (update.serverUrl && update.serverUrl !== this.serverUrl) {
      this.serverUrl = update.serverUrl;
      reconnect = true;
    }
    if (update.preset && update.preset !== this.preset) {
      this.preset = update.preset;
      if (!reconnect) {
        this._send({
          type: "load_vst",
          vstId: this.vstId,
          sessionId: this.sessionId,
          preset: this.preset,
        });
      }
    }

    if (reconnect) {
      this.stopAllNotes();
      this._disconnect();
      this.loadPromise = null;
      this.preload();
    }

    this.config = { ...this.config, ...config } as VSTStreamConfig;
  }

  private _disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this.audioWorkletNode?.disconnect();
    this.audioWorkletNode = null;
    this.isWorkletReady = false;
  }

  dispose(): void {
    this.stopAllNotes();
    this._disconnect();
    this.activeNotes.clear();
    this.stateCallbacks.clear();
    this._state = "idle";
    this.loadPromise = null;
  }
}

export const VST_LIST = [
  { id: "surge", name: "Surge XT", type: "Hybrid Synth" },
  { id: "vital", name: "Vital", type: "Wavetable Synth" },
  { id: "dexed", name: "Dexed", type: "FM Synth (DX7)" },
  { id: "tal-noisemaker", name: "TAL-NoiseMaker", type: "Analog Synth" },
] as const;

export type VSTName = (typeof VST_LIST)[number]["id"];
