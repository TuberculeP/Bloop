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

const RELEASE_SECONDS = 0.02;

type ActiveSource = (
  | { kind: "buffer"; source: AudioBufferSourceNode }
  | { kind: "stretch"; voice: StretchVoice }
) & {
  gainNode: GainNode;
  // Scheduled stop time (Infinity while playing). The entry stays until the
  // source has ended, so a stop can still be moved earlier.
  stopAt: number;
};

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

  // Audio clip methods. `when` is an AudioContext time (omitted = now). A
  // clip whose start time already passed (sample decoded late) starts now,
  // skipping the elapsed part so it stays in sync with the timeline.
  playClip(
    clipId: string,
    buffer: AudioBuffer,
    offsetSeconds: number = 0,
    durationSeconds?: number,
    when?: number,
  ): void {
    const { startTime, lateBy } = this.resolveStart(when);
    this.stopClip(clipId, startTime);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(this.gain, startTime);

    source.connect(gainNode);
    gainNode.connect(this.destination);

    const actualOffset = Math.max(
      0,
      Math.min(offsetSeconds + lateBy, buffer.duration),
    );
    const remainingDuration = buffer.duration - actualOffset;
    const actualDuration =
      durationSeconds !== undefined
        ? Math.min(durationSeconds - lateBy, remainingDuration)
        : remainingDuration;
    if (actualDuration <= 0) return;

    source.start(startTime, actualOffset, actualDuration);

    source.onended = () => {
      if (this.activeSources.get(clipId)?.gainNode === gainNode) {
        this.activeSources.delete(clipId);
      }
      try {
        source.disconnect();
        gainNode.disconnect();
      } catch {
        // Ignore if already disconnected
      }
    };

    this.activeSources.set(clipId, {
      kind: "buffer",
      source,
      gainNode,
      stopAt: Infinity,
    });
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
    when?: number,
  ): Promise<void> {
    await ensureStretchEngineReady(this.audioContext);

    const { startTime, lateBy } = this.resolveStart(when);
    this.stopClip(clipId, startTime);
    // Offset and duration are in source time: lateness scales by the rate.
    const skipped = lateBy * playbackRate;
    if (durationSeconds - skipped <= 0) return;

    const voice = createStretchVoice({
      context: this.audioContext,
      buffer,
      playbackRate,
      detuneCents,
    });

    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(this.gain, startTime);

    voice.connect(gainNode);
    gainNode.connect(this.destination);

    voice.onended = () => {
      if (this.activeSources.get(clipId)?.gainNode === gainNode) {
        this.activeSources.delete(clipId);
      }
      try {
        gainNode.disconnect();
      } catch {
        // Ignore if already disconnected
      }
    };

    voice.start(startTime, offsetSeconds + skipped, durationSeconds - skipped);

    this.activeSources.set(clipId, {
      kind: "stretch",
      voice,
      gainNode,
      stopAt: Infinity,
    });
  }

  // Short fade then stop, both scheduled on the audio clock. Stopping before
  // the scheduled start means the clip never sounds.
  stopClip(clipId: string, when?: number): void {
    const active = this.activeSources.get(clipId);
    if (!active) return;
    const stopTime = this.resolveTime(when);
    if (stopTime >= active.stopAt) return;
    active.stopAt = stopTime;

    const gain = active.gainNode.gain;
    try {
      gain.cancelScheduledValues(stopTime);
      gain.setValueAtTime(this.gain, stopTime);
      gain.exponentialRampToValueAtTime(0.001, stopTime + RELEASE_SECONDS);
      if (active.kind === "buffer") {
        active.source.stop(stopTime + RELEASE_SECONDS + 0.01);
      } else {
        active.voice.stop(stopTime + RELEASE_SECONDS + 0.01);
      }
    } catch {
      // Already stopped
    }
  }

  private resolveStart(when?: number): { startTime: number; lateBy: number } {
    const now = this.audioContext.currentTime;
    if (when === undefined || when >= now) {
      return { startTime: when ?? now, lateBy: 0 };
    }
    return { startTime: now, lateBy: now - when };
  }

  stopAllClips(): void {
    for (const clipId of [...this.activeSources.keys()]) {
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
