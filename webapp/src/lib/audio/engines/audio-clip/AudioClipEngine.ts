import type {
  AudioTrackConfig,
  InstrumentConfigUpdate,
  NoteName,
} from "../../../utils/types";
import { BaseEngine } from "../BaseEngine";
import {
  createStretchVoice,
  ensureStretchEngineReady,
  type StretchVoice,
} from "../stretchEngine";

type ActiveSource =
  | { kind: "buffer"; source: AudioBufferSourceNode; gainNode: GainNode }
  | { kind: "stretch"; voice: StretchVoice; gainNode: GainNode };

export class AudioClipEngine extends BaseEngine {
  readonly type = "audioTrack";
  readonly resourceKey = null;
  readonly resourceLabel = "Audio Track";

  private activeSources: Map<string, ActiveSource> = new Map();
  private gain: number;

  constructor(
    audioContext: AudioContext,
    destination: AudioNode,
    config: AudioTrackConfig,
  ) {
    super(audioContext, destination, config);
    this.gain = config.gain ?? 1;
    this._state = "ready";
  }

  async preload(): Promise<void> {
    // No-op: AudioClipEngine is always ready (buffers loaded externally)
  }

  // MIDI methods are no-op for audio tracks
  playNote(_noteName: NoteName, _noteId: string, _velocity?: number): void {
    // No-op: Audio tracks don't play MIDI notes
  }

  stopNote(_noteId: string): void {
    // No-op: Audio tracks don't play MIDI notes
  }

  stopAllNotes(): void {
    this.stopAllClips();
  }

  // Audio clip methods
  playClip(
    clipId: string,
    buffer: AudioBuffer,
    offsetSeconds: number = 0,
    durationSeconds?: number,
  ): void {
    if (this.activeSources.has(clipId)) {
      this.stopClip(clipId);
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(this.gain, this.audioContext.currentTime);

    source.connect(gainNode);
    gainNode.connect(this.destination);

    const actualOffset = Math.max(0, Math.min(offsetSeconds, buffer.duration));
    const remainingDuration = buffer.duration - actualOffset;
    const actualDuration =
      durationSeconds !== undefined
        ? Math.min(durationSeconds, remainingDuration)
        : remainingDuration;

    source.start(0, actualOffset, actualDuration);

    source.onended = () => {
      this.activeSources.delete(clipId);
      try {
        source.disconnect();
        gainNode.disconnect();
      } catch {
        // Ignore if already disconnected
      }
    };

    this.activeSources.set(clipId, { kind: "buffer", source, gainNode });
  }

  // Clip stretché (BPM-synchronisé) et/ou tuné : passe par le moteur de
  // stretch/pitch partagé (stretchEngine.ts, SoundTouchJS) au lieu d'un
  // AudioBufferSourceNode brut, pour découpler pitch et durée. N'affecte
  // jamais playClip() ni les clips ni stretched ni tunés, qui gardent leur
  // chemin natif inchangé.
  async playStretchedClip(
    clipId: string,
    buffer: AudioBuffer,
    offsetSeconds: number,
    durationSeconds: number,
    playbackRate: number,
    detuneCents: number,
  ): Promise<void> {
    if (this.activeSources.has(clipId)) {
      this.stopClip(clipId);
    }

    await ensureStretchEngineReady(this.audioContext);

    const voice = createStretchVoice({
      context: this.audioContext,
      buffer,
      playbackRate,
      detuneCents,
    });

    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(this.gain, this.audioContext.currentTime);

    voice.connect(gainNode);
    gainNode.connect(this.destination);

    voice.onended = () => {
      const active = this.activeSources.get(clipId);
      if (active?.kind === "stretch" && active.voice === voice) {
        this.activeSources.delete(clipId);
        try {
          gainNode.disconnect();
        } catch {
          // Ignore if already disconnected
        }
      }
    };

    voice.start(0, offsetSeconds, durationSeconds);

    this.activeSources.set(clipId, { kind: "stretch", voice, gainNode });
  }

  stopClip(clipId: string): void {
    const active = this.activeSources.get(clipId);
    if (active) {
      try {
        active.gainNode.gain.exponentialRampToValueAtTime(
          0.001,
          this.audioContext.currentTime + 0.02,
        );
        setTimeout(() => {
          try {
            if (active.kind === "buffer") {
              active.source.stop();
              active.source.disconnect();
            } else {
              active.voice.stop();
            }
            active.gainNode.disconnect();
          } catch {
            // Ignore if already stopped
          }
        }, 30);
      } catch {
        // Ignore errors
      }
      this.activeSources.delete(clipId);
    }
  }

  stopAllClips(): void {
    for (const clipId of this.activeSources.keys()) {
      this.stopClip(clipId);
    }
  }

  updateConfig(config: InstrumentConfigUpdate): void {
    if (config.gain !== undefined) {
      this.gain = config.gain;
    }
    this.config = { ...this.config, ...config } as AudioTrackConfig;
  }

  dispose(): void {
    this.stopAllClips();
    this.activeSources.clear();
    this.stateCallbacks.clear();
    this._state = "idle";
  }
}
