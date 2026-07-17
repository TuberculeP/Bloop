import type {
  AudioTrackConfig,
  InstrumentConfig,
  NoteName,
} from "../../../utils/types";
import { BaseEngine } from "../BaseEngine";

interface ActiveSource {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
}

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

    this.activeSources.set(clipId, { source, gainNode });
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
            active.source.stop();
            active.source.disconnect();
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

  updateConfig(config: Partial<InstrumentConfig>): void {
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
