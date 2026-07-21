interface PooledSampler {
  disconnect(): void;
}

interface Voice<TSampler extends PooledSampler> {
  sampler: TSampler;
  envelopeGain: GainNode;
  noteId: string | null;
  stopFn: ((time?: number) => void) | null;
}

/**
 * Pool de voix pour instruments basés sur des samplers `smplr` (Soundfont,
 * Soundfont2Sampler...) dont la destination audio est fixée à la construction
 * et partagée par toutes les notes jouées par une même instance — impossible
 * d'insérer une enveloppe par note en aval. On pré-charge donc `size`
 * instances de sampler, chacune reliée à son propre GainNode d'enveloppe, et
 * on alloue une voix libre (ou la plus ancienne, en voice stealing) par note
 * jouée, pour un ADSR réellement indépendant par voix en polyphonie.
 */
export class VoicePool<TSampler extends PooledSampler> {
  private voices: Voice<TSampler>[] = [];
  private voiceByNoteId = new Map<string, Voice<TSampler>>();
  private nextVoiceIndex = 0;

  async load(
    size: number,
    audioContext: AudioContext,
    destination: AudioNode,
    createSampler: (envelopeGain: GainNode) => Promise<TSampler>,
  ): Promise<void> {
    this.dispose();
    this.voices = await Promise.all(
      Array.from({ length: size }, async () => {
        const envelopeGain = audioContext.createGain();
        envelopeGain.gain.value = 0;
        envelopeGain.connect(destination);
        const sampler = await createSampler(envelopeGain);
        return { sampler, envelopeGain, noteId: null, stopFn: null };
      }),
    );
  }

  get first(): TSampler | null {
    return this.voices[0]?.sampler ?? null;
  }

  async forEachSampler(
    fn: (sampler: TSampler) => Promise<void> | void,
  ): Promise<void> {
    await Promise.all(this.voices.map((voice) => fn(voice.sampler)));
  }

  play(
    noteId: string,
    audioContext: AudioContext,
    attack: number,
    decay: number,
    sustain: number,
    startSample: (sampler: TSampler) => (time?: number) => void,
  ): void {
    if (this.voices.length === 0) return;

    this.hardStopByNoteId(noteId);

    const voice = this.allocateVoice();
    voice.noteId = noteId;
    this.voiceByNoteId.set(noteId, voice);

    const now = audioContext.currentTime;
    const gain = voice.envelopeGain.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(0, now);
    if (attack > 0) {
      gain.linearRampToValueAtTime(1, now + attack);
    } else {
      gain.setValueAtTime(1, now);
    }
    if (decay > 0 && sustain < 1) {
      gain.linearRampToValueAtTime(sustain, now + attack + decay);
    }

    voice.stopFn = startSample(voice.sampler);
  }

  stop(noteId: string, audioContext: AudioContext, release: number): void {
    const voice = this.voiceByNoteId.get(noteId);
    if (!voice) return;

    voice.stopFn?.();
    const now = audioContext.currentTime;
    voice.envelopeGain.gain.cancelScheduledValues(now);
    voice.envelopeGain.gain.setValueAtTime(voice.envelopeGain.gain.value, now);
    voice.envelopeGain.gain.linearRampToValueAtTime(0, now + release);

    voice.noteId = null;
    this.voiceByNoteId.delete(noteId);
  }

  stopAll(audioContext: AudioContext, release: number): void {
    for (const noteId of [...this.voiceByNoteId.keys()]) {
      this.stop(noteId, audioContext, release);
    }
  }

  dispose(): void {
    for (const voice of this.voices) {
      voice.stopFn?.();
      voice.sampler.disconnect();
      voice.envelopeGain.disconnect();
    }
    this.voices = [];
    this.voiceByNoteId.clear();
    this.nextVoiceIndex = 0;
  }

  private allocateVoice(): Voice<TSampler> {
    const free = this.voices.find((voice) => voice.noteId === null);
    if (free) return free;

    const voice = this.voices[this.nextVoiceIndex];
    this.nextVoiceIndex = (this.nextVoiceIndex + 1) % this.voices.length;
    this.hardStop(voice);
    return voice;
  }

  private hardStopByNoteId(noteId: string): void {
    const voice = this.voiceByNoteId.get(noteId);
    if (voice) this.hardStop(voice);
  }

  private hardStop(voice: Voice<TSampler>): void {
    if (voice.noteId !== null) this.voiceByNoteId.delete(voice.noteId);
    voice.stopFn?.();
    voice.stopFn = null;
    voice.noteId = null;
    voice.envelopeGain.gain.cancelScheduledValues(0);
    voice.envelopeGain.gain.value = 0;
  }
}
