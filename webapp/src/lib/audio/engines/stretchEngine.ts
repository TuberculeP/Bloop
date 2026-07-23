import { SoundTouchNode, processOffline } from "@soundtouchjs/audio-worklet";
import processorUrl from "@soundtouchjs/audio-worklet/processor?url";

// Enregistrement du worklet SoundTouch : une fois par AudioContext (l'app
// n'en a qu'un seul, partagé — voir audioBusStore.ts qui déclenche cet appel
// dès la création du contexte). isStretchEngineReady() expose un flag
// synchrone pour les call sites qui ne peuvent pas attendre une promesse
// (SamplePlayerEngine.playNote, déclenchement temps réel d'une note).
const registrations = new WeakMap<
  BaseAudioContext,
  { promise: Promise<void>; ready: boolean }
>();

export function ensureStretchEngineReady(
  context: BaseAudioContext,
): Promise<void> {
  let entry = registrations.get(context);
  if (!entry) {
    const promise = SoundTouchNode.register(context, processorUrl).then(() => {
      entry!.ready = true;
    });
    entry = { promise, ready: false };
    registrations.set(context, entry);
  }
  return entry.promise;
}

export function isStretchEngineReady(context: BaseAudioContext): boolean {
  return registrations.get(context)?.ready ?? false;
}

export interface StretchVoiceOptions {
  context: BaseAudioContext;
  buffer: AudioBuffer;
  playbackRate?: number; // défaut 1 (pas d'étirement)
  detuneCents?: number; // défaut 0 (pas de tune)
}

export interface StretchVoice {
  connect(destination: AudioNode): void;
  start(when: number, offsetSeconds: number, durationSeconds: number): void;
  stop(): void;
  onended: (() => void) | null;
}

// Une "voix" de stretch/pitch, découplant durée et hauteur via SoundTouchJS
// (WSOLA, tourne dans un AudioWorklet). Couvre deux nodes connectés (source
// natif + SoundTouchNode) derrière la même interface {connect, start, stop,
// onended} qu'un moteur de lecture "normal" — seul point d'extension si on
// change un jour d'algorithme/librairie de stretch.
export interface RenderStretchedBufferOptions {
  // Fenêtre native À RENDRE, avec `padFrames` frames de préroll déjà
  // préfixées en tête (voir buildPaddedNativeWindow dans
  // stretchRenderCacheStore.ts — construit ce préroll à partir de vrai audio
  // précédent quand disponible, jamais du silence).
  buffer: AudioBuffer;
  playbackRate?: number; // défaut 1
  detuneCents?: number; // défaut 0
  padFrames?: number; // défaut 0 : nb de frames natives de préroll à couper après rendu
}

// Pré-rendu offline (OfflineAudioContext, pas de contrainte temps réel) d'un
// buffer étiré/tuné — utilisé pour peupler le cache (stretchRenderCacheStore)
// au lieu de payer le coût de construction d'un SoundTouchNode + la latence
// de traitement WSOLA à chaque déclenchement de lecture (voir plan, §10).
//
// Le pipe WSOLA de SoundTouch a besoin d'accumuler un minimum de signal
// avant de produire une sortie propre (warm-up structurel — voir
// soundtouch-processor.js: `toExtract = Math.min(available, frameCount)`,
// zero-fill tant que le buffer interne n'est pas assez rempli).
// `processOffline` ne compense jamais ce délai tout seul.
//
// Un premier essai avait préfixé l'entrée de silence pur (jusqu'à 1.5s) avant
// de couper la portion correspondante en sortie — mesuré : le résidu de
// silence en tête restait constant (~90-100ms) QUELLE QUE SOIT la quantité
// de silence ajoutée avant. Conclusion : le problème n'est pas un manque de
// marge, c'est la transition silence -> signal elle-même qui empêche le pipe
// de bien s'amorcer (il a besoin de signal non trivial, pas de zéros). Fix
// définitif : le préroll est maintenant construit par l'appelant à partir de
// VRAI audio (contenu natif précédant réellement le clip dans le sample
// source, ou à défaut un "mirror" du tout début du clip — jamais du
// silence), passé ici via `padFrames`. On rend l'ensemble puis on jette
// exactement la portion de sortie correspondant à ce préroll.
export async function renderStretchedBuffer(
  options: RenderStretchedBufferOptions,
): Promise<AudioBuffer> {
  const { buffer, playbackRate = 1, detuneCents = 0, padFrames = 0 } = options;

  const rendered = await processOffline({
    input: buffer,
    processorUrl,
    playbackRate,
    pitch: Math.pow(2, detuneCents / 1200),
  });

  const desiredNativeLength = buffer.length - padFrames;
  const desiredLength = Math.ceil(desiredNativeLength / playbackRate);
  const padOutputFrames = Math.min(
    Math.round(padFrames / playbackRate),
    Math.max(0, rendered.length - desiredLength),
  );

  const trimmed = new AudioBuffer({
    numberOfChannels: rendered.numberOfChannels,
    length: desiredLength,
    sampleRate: rendered.sampleRate,
  });
  for (let ch = 0; ch < rendered.numberOfChannels; ch++) {
    const slice = rendered
      .getChannelData(ch)
      .slice(
        padOutputFrames,
        padOutputFrames + desiredLength,
      ) as Float32Array<ArrayBuffer>;
    trimmed.copyToChannel(slice, ch);
  }
  return trimmed;
}

export function createStretchVoice(options: StretchVoiceOptions): StretchVoice {
  const { context, buffer, playbackRate = 1, detuneCents = 0 } = options;

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;

  const stNode = new SoundTouchNode({ context });
  // Miroir obligatoire de source.playbackRate : le processeur s'en sert pour
  // annuler le changement de pitch induit par le playbackRate de la source,
  // et n'applique plus que le pitch-shift indépendant demandé ci-dessous.
  stNode.playbackRate.value = playbackRate;
  stNode.pitch.value = Math.pow(2, detuneCents / 1200);
  source.connect(stNode);

  let endedCallback: (() => void) | null = null;
  source.onended = () => endedCallback?.();

  return {
    connect: (destination) => stNode.connect(destination),
    start: (when, offsetSeconds, durationSeconds) =>
      source.start(when, offsetSeconds, durationSeconds),
    stop: () => {
      try {
        source.stop();
      } catch {
        // déjà arrêté
      }
    },
    set onended(cb: (() => void) | null) {
      endedCallback = cb;
    },
    get onended() {
      return endedCallback;
    },
  };
}
