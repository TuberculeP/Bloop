import { envelopeLevelAt, holdParamAt } from "./scheduling";

interface PooledSampler {
  disconnect(): void;
}

// Rend la main au navigateur entre deux voix — construire les 8 voix d'un
// coup (Promise.all) bloque le thread principal sans interruption pendant
// tout le chargement, ce qui gèle l'UI (barre de progression comprise).
// requestAnimationFrame (plutôt que setTimeout) aligne le yield sur le
// prochain paint, sans dépendre du clampage des timers imbriqués du navigateur.
function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

// Exécute `action` sur chaque item, en rendant la main au navigateur entre
// deux items (jamais après le dernier) — factorisé car `load()` et
// `forEachSampler()` ont toutes deux besoin de ce même découpage.
async function withYieldBetween<T>(
  items: T[],
  action: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    await action(items[i]);
    if (i < items.length - 1) await yieldToBrowser();
  }
}

interface Voice<TSampler extends PooledSampler> {
  sampler: TSampler;
  envelopeGain: GainNode;
  noteId: string | null;
  stopFn: ((time?: number) => void) | null;
  // Scheduled release time of the current note (Infinity while held). The
  // voice is free for any note starting at or after it.
  stopAt: number;
  // Envelope of the current note, to estimate its level at a future release
  // time (see holdParamAt).
  startTime: number;
  attack: number;
  decay: number;
  sustain: number;
}

/**
 * Pool de voix pour instruments basés sur des samplers `smplr` (Soundfont,
 * Soundfont2Sampler...) dont la destination audio est fixée à la construction
 * et partagée par toutes les notes jouées par une même instance — impossible
 * d'insérer une enveloppe par note en aval. On pré-charge donc `size`
 * instances de sampler, chacune reliée à son propre GainNode d'enveloppe, et
 * on alloue une voix libre (ou la plus ancienne, en voice stealing) par note
 * jouée, pour un ADSR réellement indépendant par voix en polyphonie.
 *
 * Start and stop take an AudioContext time, so notes can be scheduled ahead.
 * A stop can be moved earlier (e.g. playback stopped before a scheduled
 * release), never later.
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
    const voices: Voice<TSampler>[] = [];
    await withYieldBetween(Array.from({ length: size }), async () => {
      const envelopeGain = audioContext.createGain();
      envelopeGain.gain.value = 0;
      envelopeGain.connect(destination);
      const sampler = await createSampler(envelopeGain);
      voices.push({
        sampler,
        envelopeGain,
        noteId: null,
        stopFn: null,
        stopAt: 0,
        startTime: 0,
        attack: 0,
        decay: 0,
        sustain: 1,
      });
    });
    this.voices = voices;
  }

  get first(): TSampler | null {
    return this.voices[0]?.sampler ?? null;
  }

  async forEachSampler(
    fn: (sampler: TSampler) => Promise<void> | void,
  ): Promise<void> {
    await withYieldBetween(this.voices, async (voice) => {
      await fn(voice.sampler);
    });
  }

  play(
    noteId: string,
    audioContext: AudioContext,
    attack: number,
    decay: number,
    sustain: number,
    startSample: (sampler: TSampler, time: number) => (time?: number) => void,
    when: number = audioContext.currentTime,
  ): void {
    if (this.voices.length === 0) return;

    // Retrigger of a note still held: cut it where the new one starts.
    const held = this.voiceByNoteId.get(noteId);
    if (held && held.noteId === noteId && held.stopAt > when) {
      this.hardStop(held, when);
    }

    const voice = this.allocateVoice(when);
    if (
      voice.noteId !== null &&
      this.voiceByNoteId.get(voice.noteId) === voice
    ) {
      this.voiceByNoteId.delete(voice.noteId);
    }
    voice.noteId = noteId;
    voice.stopAt = Infinity;
    voice.startTime = when;
    voice.attack = attack;
    voice.decay = decay;
    voice.sustain = sustain;
    this.voiceByNoteId.set(noteId, voice);

    const gain = voice.envelopeGain.gain;
    gain.cancelScheduledValues(when);
    gain.setValueAtTime(0, when);
    if (attack > 0) {
      gain.linearRampToValueAtTime(1, when + attack);
    } else {
      gain.setValueAtTime(1, when);
    }
    if (decay > 0 && sustain < 1) {
      gain.linearRampToValueAtTime(sustain, when + attack + decay);
    }

    voice.stopFn = startSample(voice.sampler, when);
  }

  stop(
    noteId: string,
    audioContext: AudioContext,
    release: number,
    when: number = audioContext.currentTime,
  ): void {
    const voice = this.voiceByNoteId.get(noteId);
    if (!voice || voice.noteId !== noteId || when >= voice.stopAt) return;
    voice.stopAt = when;

    voice.stopFn?.(when);
    const gain = voice.envelopeGain.gain;
    const fallback =
      when <= audioContext.currentTime
        ? gain.value
        : envelopeLevelAt(
            when - voice.startTime,
            1,
            voice.attack,
            voice.decay,
            voice.sustain,
          );
    holdParamAt(gain, when, fallback);
    gain.linearRampToValueAtTime(0, when + release);
  }

  stopAll(audioContext: AudioContext, release: number): void {
    for (const voice of this.voices) {
      if (voice.noteId !== null) {
        this.stop(voice.noteId, audioContext, release);
      }
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

  private allocateVoice(when: number): Voice<TSampler> {
    const free = this.voices.find((voice) => voice.stopAt <= when);
    if (free) return free;

    const voice = this.voices[this.nextVoiceIndex];
    this.nextVoiceIndex = (this.nextVoiceIndex + 1) % this.voices.length;
    this.hardStop(voice, when);
    return voice;
  }

  // Cuts the voice at `when` (the start of the note that takes it over), so
  // a voice stolen ahead of time keeps sounding until then.
  private hardStop(voice: Voice<TSampler>, when: number): void {
    voice.stopFn?.(when);
    voice.stopFn = null;
    voice.stopAt = Math.min(voice.stopAt, when);
    voice.envelopeGain.gain.cancelScheduledValues(when);
    voice.envelopeGain.gain.setValueAtTime(0, when);
  }
}
