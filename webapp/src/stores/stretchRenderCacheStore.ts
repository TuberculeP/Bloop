import { defineStore } from "pinia";
import { openDB, type IDBPDatabase } from "idb";
import type { AudioClip } from "../lib/utils/types";
import {
  computeClipPlaybackParams,
  type ClipPlaybackParams,
} from "../lib/audio/clipStretch";
import { renderStretchedBuffer } from "../lib/audio/engines/stretchEngine";
import { createDebouncer } from "../lib/utils/debounce";
import { useTimelineStore } from "./timelineStore";
import { useAudioLibraryStore } from "./audioLibraryStore";
import { useAudioBusStore } from "./audioBusStore";

export function buildStretchCacheKey(
  sampleId: string,
  params: ClipPlaybackParams,
): string {
  return [
    sampleId,
    params.offsetSeconds.toFixed(3),
    params.durationSeconds.toFixed(3),
    params.playbackRate.toFixed(4),
    params.detuneCents.toFixed(1),
  ].join(":");
}

// Dédup des rendus concurrents pour une même clé (ex. deux déclenchements
// rapprochés avant que le premier rendu ne soit en cache).
const inFlight = new Map<string, Promise<void>>();

// Cache mémoire des AudioBuffer déjà reconstruits — même rôle que
// `buffers` dans audioLibraryStore pour les samples natifs : une fois un
// rendu chargé une première fois (depuis IndexedDB ou fraîchement calculé),
// il reste résident en mémoire pour le reste de la session. Sans ça, `get()`
// relit et redésérialise le PCM complet depuis IndexedDB à CHAQUE play — un
// coût qui grandit avec la durée du rendu (plus un clip est étiré en durée,
// plus le buffer stocké est gros), exactement le symptôme "plus j'étire, plus
// c'est lent" observé alors que le cache est déjà chaud.
const decodedBuffers = new Map<string, AudioBuffer>();

// Marge de préroll fournie au moteur de stretch avant le point de départ
// réel du clip — voir buildPaddedNativeWindow ci-dessous.
const NATIVE_PAD_SECONDS = 0.4;

// Extrait la fenêtre native [offsetSeconds, offsetSeconds+durationSeconds[ du
// buffer source, préfixée d'un préroll de `NATIVE_PAD_SECONDS` construit à
// partir de VRAI audio (jamais du silence) : le pipe WSOLA de SoundTouch a
// besoin de signal non trivial pour s'amorcer correctement — du silence en
// tête laisse un artefact fixe (~90-100ms, mesuré) quelle que soit sa durée,
// voir stretchEngine.ts. Le préroll vient du contenu natif précédant
// réellement le clip dans le sample source quand il y en a assez ; sinon
// (clip trimmé depuis le tout début du sample), on complète par un "mirror"
// (les toutes premières frames du clip lui-même, inversées) — jamais parfait
// musicalement mais toujours du signal réel, pas des zéros.
function buildPaddedNativeWindow(
  audioContext: BaseAudioContext,
  buffer: AudioBuffer,
  offsetSeconds: number,
  durationSeconds: number,
): { windowed: AudioBuffer; padFrames: number } {
  const { sampleRate } = buffer;
  const clipStartFrame = Math.max(0, Math.floor(offsetSeconds * sampleRate));
  const clipFrameCount = Math.max(
    1,
    Math.min(
      Math.round(durationSeconds * sampleRate),
      buffer.length - clipStartFrame,
    ),
  );

  const padFrames = Math.ceil(NATIVE_PAD_SECONDS * sampleRate);
  const realPadFrames = Math.min(padFrames, clipStartFrame);
  const mirrorFrames = padFrames - realPadFrames;
  const coreStartFrame = clipStartFrame - realPadFrames;
  const coreFrameCount = realPadFrames + clipFrameCount;

  const windowed = audioContext.createBuffer(
    buffer.numberOfChannels,
    padFrames + clipFrameCount,
    sampleRate,
  );

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const core = buffer
      .getChannelData(ch)
      .slice(coreStartFrame, coreStartFrame + coreFrameCount);

    if (mirrorFrames > 0) {
      const mirror = core.slice(0, mirrorFrames).reverse();
      windowed.copyToChannel(mirror as Float32Array<ArrayBuffer>, ch, 0);
      windowed.copyToChannel(
        core as Float32Array<ArrayBuffer>,
        ch,
        mirrorFrames,
      );
    } else {
      windowed.copyToChannel(core as Float32Array<ArrayBuffer>, ch, 0);
    }
  }

  return { windowed, padFrames };
}

interface CachedStretchRender {
  key: string;
  channels: Float32Array[];
  sampleRate: number;
  length: number;
  numberOfChannels: number;
  cachedAt: number;
  size: number;
}

const DB_NAME = "bloop-stretch-cache";
// v2 : invalide les rendus mis en cache par la v1, qui étirait le sample
// entier (position 0) au lieu de la fenêtre réelle du clip (startOffset).
// v3 : invalide les rendus v2, qui contenaient un silence de démarrage
// (warm-up du pipe WSOLA jamais compensé par processOffline — voir
// renderStretchedBuffer dans stretchEngine.ts).
// v4 : diagnostic (marge de silence 250ms -> 1.5s), a confirmé que le
// silence en tête n'est pas une question de marge.
// v5 : le préroll est désormais du vrai audio (contenu natif précédant le
// clip, ou mirror du début du clip) au lieu de silence — voir
// buildPaddedNativeWindow. Contenu dérivé/régénérable, pas de perte à tout
// recalculer.
const DB_VERSION = 5;
const STORE_NAME = "renders";
// Contenu dérivé/regénérable (contrairement à sampleCacheStore, la source de
// vérité) : pas besoin de partager son budget de 500MB, un plafond plus
// modeste suffit largement pour quelques dizaines de clips étirés en cache.
const MAX_CACHE_SIZE = 200 * 1024 * 1024; // 200MB

// Un changement de BPM ou un resize en mode stretch change le playbackRate
// d'un clip stretché — les rendus déjà en cache deviennent obsolètes (cache
// miss naturel, la clé inclut le playbackRate). recomputeAllStretchedClips
// relance un pré-calcul en fond pour tous les clips stretchés du projet dès
// que ça se stabilise (debounced), pour qu'un premier play soit déjà rapide
// plutôt que de dépendre du fallback "cache miss → lecture live + re-cache"
// de trackAudioStore. Le timer vit ici (module-level, comme `inFlight`/
// `decodedBuffers` ci-dessus) plutôt que dans un composable Vue, pour être
// appelable depuis n'importe où (watcher de tempo, ou juste après un resize
// dans AudioClipRow.vue) sans prop-drilling ni second watcher redondant.
const RECOMPUTE_DEBOUNCE_MS = 600;

async function recomputeAllStretchedClips(): Promise<void> {
  const timelineStore = useTimelineStore();
  const audioLibraryStore = useAudioLibraryStore();
  const audioBusStore = useAudioBusStore();
  const stretchRenderCacheStore = useStretchRenderCacheStore();

  const tempo = timelineStore.tempo;
  for (const track of timelineStore.project.tracks) {
    if (track.instrument.type !== "audioTrack" || !track.clips) continue;
    for (const clip of track.clips) {
      if (!clip.stretched) continue;
      const buffer = await audioLibraryStore.loadSample(clip.sampleId);
      if (!buffer) continue;
      stretchRenderCacheStore.ensureStretchedClipCached(
        clip,
        buffer,
        tempo,
        audioBusStore.audioContext,
      );
    }
  }
}

const recomputeDebouncer = createDebouncer(
  recomputeAllStretchedClips,
  RECOMPUTE_DEBOUNCE_MS,
);

export const useStretchRenderCacheStore = defineStore("stretchRenderCache", {
  state: () => ({
    db: null as IDBPDatabase | null,
    isInitialized: false,
    cacheSize: 0,
    // Clips actuellement en cours de re-rendu en fond (BPM changé, tune
    // changé, ou premier stretch jamais mis en cache) — consommé par
    // useAudioClipCanvas.ts pour afficher le placeholder de chargement
    // existant pendant le recalcul.
    pendingClipIds: new Set<string>() as Set<string>,
  }),

  actions: {
    async initialize(): Promise<void> {
      if (this.isInitialized) return;

      this.db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Recrée le store à chaque montée de version : contenu
          // dérivé/regénérable, plus simple et plus sûr que migrer les
          // entrées existantes en place.
          if (db.objectStoreNames.contains(STORE_NAME)) {
            db.deleteObjectStore(STORE_NAME);
          }
          const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
          store.createIndex("cachedAt", "cachedAt");
        },
      });

      await this.calculateCacheSize();
      this.isInitialized = true;
    },

    async get(
      key: string,
      audioContext: BaseAudioContext,
    ): Promise<AudioBuffer | null> {
      const resident = decodedBuffers.get(key);
      if (resident) return resident;

      if (!this.isInitialized) await this.initialize();
      if (!this.db) return null;

      const cached = (await this.db.get(STORE_NAME, key)) as
        CachedStretchRender | undefined;
      if (!cached) return null;

      const buffer = audioContext.createBuffer(
        cached.numberOfChannels,
        cached.length,
        cached.sampleRate,
      );
      for (let ch = 0; ch < cached.numberOfChannels; ch++) {
        // IndexedDB (structured clone) rend un Float32Array<ArrayBufferLike>
        // plutôt que le Float32Array<ArrayBuffer> attendu par copyToChannel —
        // même bibliothèque de types stricte que overdrive.ts/exportEncoders.ts.
        buffer.copyToChannel(
          cached.channels[ch] as Float32Array<ArrayBuffer>,
          ch,
        );
      }
      decodedBuffers.set(key, buffer);

      // Rafraîchit le timestamp LRU en fond, sans jamais retarder le retour
      // du buffer : ce `get` est sur le chemin chaud du play (déclenché
      // just-in-time, sans lookahead — cf. useTimelinePlaybackEngine), une
      // écriture IndexedDB bloquante ici réintroduirait la latence qu'on a
      // justement construit ce cache pour éliminer.
      cached.cachedAt = Date.now();
      this.db.put(STORE_NAME, cached).catch((e) => {
        console.error("[StretchCache] Failed to refresh LRU timestamp:", e);
      });

      return buffer;
    },

    async set(key: string, buffer: AudioBuffer): Promise<void> {
      if (!this.isInitialized) await this.initialize();
      if (!this.db) return;

      const channels: Float32Array[] = [];
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        channels.push(buffer.getChannelData(ch).slice());
      }
      const size = channels.reduce((sum, c) => sum + c.byteLength, 0);

      await this.ensureSpace(size);

      const entry: CachedStretchRender = {
        key,
        channels,
        sampleRate: buffer.sampleRate,
        length: buffer.length,
        numberOfChannels: buffer.numberOfChannels,
        cachedAt: Date.now(),
        size,
      };
      await this.db.put(STORE_NAME, entry);
      this.cacheSize += size;
      // Le rendu vient d'être produit en mémoire (renderStretchedBuffer) :
      // pas besoin d'attendre un futur `get()` pour le rendre résident, le
      // premier play qui suivra doit déjà le trouver instantanément.
      decodedBuffers.set(key, buffer);
    },

    async ensureSpace(needed: number): Promise<void> {
      if (!this.db) return;

      while (this.cacheSize + needed > MAX_CACHE_SIZE) {
        const tx = this.db.transaction(STORE_NAME, "readwrite");
        const index = tx.store.index("cachedAt");
        const cursor = await index.openCursor();

        if (cursor) {
          const entry = cursor.value as CachedStretchRender;
          this.cacheSize -= entry.size;
          decodedBuffers.delete(entry.key);
          await cursor.delete();
        } else {
          break;
        }
      }
    },

    async calculateCacheSize(): Promise<void> {
      if (!this.db) return;

      let total = 0;
      const all = (await this.db.getAll(STORE_NAME)) as CachedStretchRender[];
      for (const entry of all) {
        total += entry.size;
      }
      this.cacheSize = total;
    },

    async clear(): Promise<void> {
      if (!this.db) return;
      await this.db.clear(STORE_NAME);
      this.cacheSize = 0;
      decodedBuffers.clear();
    },

    async has(key: string): Promise<boolean> {
      if (!this.isInitialized) await this.initialize();
      if (!this.db) return false;
      const existing = await this.db.getKey(STORE_NAME, key);
      return existing !== undefined;
    },

    // Récupère la version pré-calculée (déjà étirée/tunée) d'un clip
    // stretché, pour lecture via le chemin natif rapide (AudioClipEngine
    // .playClip) — sans jamais construire de SoundTouchNode au
    // déclenchement. null si non stretché/tuné ou si pas encore en cache.
    async getCachedStretchedClip(
      clip: AudioClip,
      tempo: number,
      audioContext: BaseAudioContext,
    ): Promise<AudioBuffer | null> {
      const params = computeClipPlaybackParams(clip, tempo);
      if (!params.needsStretchEngine) return null;

      const key = buildStretchCacheKey(clip.sampleId, params);
      return this.get(key, audioContext);
    },

    // Pré-calcule (si besoin) et met en cache le rendu étiré/tuné d'un clip,
    // en fond — jamais bloquant pour la lecture en cours. Appelé depuis le
    // chargement de projet (dawLoadingStore), le changement de BPM en
    // session (useStretchRecompute) et en cache-miss pendant la lecture
    // (trackAudioStore).
    async ensureStretchedClipCached(
      clip: AudioClip,
      buffer: AudioBuffer,
      tempo: number,
      audioContext: BaseAudioContext,
    ): Promise<void> {
      const params = computeClipPlaybackParams(clip, tempo);
      if (!params.needsStretchEngine) return;

      const key = buildStretchCacheKey(clip.sampleId, params);
      if (await this.has(key)) return;

      const pending = inFlight.get(key);
      if (pending) return pending;

      const task = (async () => {
        this.pendingClipIds.add(clip.id);
        try {
          const { windowed, padFrames } = buildPaddedNativeWindow(
            audioContext,
            buffer,
            params.offsetSeconds,
            params.durationSeconds,
          );
          const rendered = await renderStretchedBuffer({
            buffer: windowed,
            playbackRate: params.playbackRate,
            detuneCents: params.detuneCents,
            padFrames,
          });
          await this.set(key, rendered);
        } finally {
          this.pendingClipIds.delete(clip.id);
          inFlight.delete(key);
        }
      })();
      inFlight.set(key, task);
      return task;
    },

    // Déclenche (debounced) un recalcul en fond de tous les clips stretchés
    // du projet — voir recomputeAllStretchedClips ci-dessus pour le pourquoi.
    scheduleRecompute(): void {
      recomputeDebouncer.schedule();
    },
  },
});
