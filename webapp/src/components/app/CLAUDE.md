# DAW Timeline V2 - Documentation Technique

> **V2 - Architecture simplifiée**
> Cette implémentation abandonne le concept de clips pour une approche plus intuitive : une piste = une séquence de notes. Le piano roll s'affiche inline sous la piste au lieu d'être un modal.

## Vue d'ensemble

Architecture multi-pistes style GarageBand simplifiée pour les débutants :

- **Une piste = une séquence de notes** (plus de clips intermédiaires)
- **Piano roll inline** : s'expand sous la piste au double-clic
- **Preview des notes** visible directement sur la timeline (style Ableton/FL Studio)

## Architecture V2

### Stores

| Store               | Fichier                       | Rôle                                                       |
| ------------------- | ----------------------------- | ---------------------------------------------------------- |
| `timelineStore`     | `stores/timelineStore.ts`     | Gestion des pistes et notes, état d'expansion              |
| `trackAudioStore`   | `stores/trackAudioStore.ts`   | Routing audio par piste, EQ/Reverb par piste, instruments  |
| `audioBusStore`     | `stores/audioBusStore.ts`     | Bus audio master, EQ global, reverb global                 |
| `trackHistoryStore` | `stores/trackHistoryStore.ts` | Undo/redo par piste (snapshots), batch operations          |

#### timelineStore - API

```typescript
// État
project: TimelineProject
activeTrackId: string | null
expandedTrackId: string | null  // Quelle piste a le piano roll ouvert

// Pistes
createTrack(instrument, name?): string
deleteTrack(trackId): boolean
updateTrack(trackId, updates): boolean
setTrackMuted(trackId, muted): boolean
setTrackSolo(trackId, solo): boolean
setTrackVolume(trackId, volume): boolean
setTrackReverb(trackId, reverb): boolean
updateTrackEQBand(trackId, bandId, gain): boolean

// Notes (directement sur la piste)
addNoteToTrack(trackId, note): string | null
removeNoteFromTrack(trackId, noteId): boolean
updateNoteInTrack(trackId, noteId, updates): boolean
setTrackNotes(trackId, notes[]): boolean

// Piano Roll expand/collapse
expandTrack(trackId): boolean
collapseTrack(): void
toggleTrackExpanded(trackId): void

// Playback
getPlayableTracks(): Track[]
getNotesAtPosition(notes, position): MidiNote[]
getTrackNotesAtPosition(trackId, position): MidiNote[]
```

### Types clés (`lib/utils/types.ts`)

```typescript
InstrumentType = "basicSynth" | "elementarySynth" | "smplr" | "undertale" | "audioTrack"

// Discriminated unions pour type safety
BasicSynthConfig { type: "basicSynth", oscillatorType: OscillatorType, gain? }
SmplrConfig { type: "smplr", soundfont: string, gain? }
ElementarySynthConfig { type: "elementarySynth", preset?, gain? }
UndertaleConfig { type: "undertale", instrument: string, gain?, attack?, decay?, sustain?, release? }
AudioTrackConfig { type: "audioTrack", gain? }
InstrumentConfig = BasicSynthConfig | SmplrConfig | ElementarySynthConfig | UndertaleConfig | AudioTrackConfig

// Pour les updates partiels (sans discriminant)
InstrumentConfigUpdate { oscillatorType?, soundfont?, preset?, gain? }

EQBand {
  id: string          // "sub", "bass", "mid", "presence", "brilliance"
  frequency: number   // Fréquence centrale
  gain: number        // -18 à +18 dB
  type: "lowshelf" | "peaking" | "highshelf"
  label: string       // Label affiché
}

Track {
  id, name, instrument, color, volume, reverb,
  eqBands: EQBand[],  // EQ 5 bandes par piste
  muted, solo, order,
  notes: MidiNote[]   // Notes avec positions absolues sur la timeline (MIDI tracks)
  clips?: AudioClip[] // Clips audio (audio tracks uniquement)
  createdAt, updatedAt
}

AudioClip {
  id: string
  sampleId: string    // Référence vers AudioSample
  x: number           // Position sur la timeline (en colonnes)
  w: number           // Largeur (en colonnes)
  startOffset: number // Décalage dans le sample source
}

AudioSample {
  id, name, packId, folder, filename,
  duration, waveformData?, fullUrl  // URL CDN R2
}

MidiNote {
  i: string    // ID unique
  x: number    // Position absolue sur la timeline (en colonnes)
  y: number    // Hauteur de note (0-86, 0 = aigu)
  w: number    // Durée (en colonnes)
  h: number    // Toujours 1
}

TimelineProject {
  name, tracks: Track[], cols, tempo, volume, reverb, eqBands,
  version: "4.0", createdAt, updatedAt
}

TRACK_COLORS // Palette de couleurs pour les pistes
DEFAULT_EQ_BANDS // EQ 5 bandes par défaut (via cloneEQBands())
```

### Engines Audio (`lib/audio/engines/`)

Architecture modulaire avec classe de base abstraite :

```
engines/
  types.ts              # InstrumentEngine, EngineState, EngineStateCallback
  BaseEngine.ts         # Classe abstraite avec state management
  noteUtils.ts          # noteNameToFrequency() partagé
  index.ts              # Re-exports publics

  basic-synth/
    BasicSynthEngine.ts # Oscillateurs Web Audio (toujours ready)

  smplr/
    SmplrEngine.ts      # Soundfonts via `smplr` (128+ instruments)
    soundfonts.ts       # SOUNDFONT_LIST + SoundfontName

  undertale/
    UndertaleEngine.ts  # Soundfont custom Undertale avec ADSR
```

Factory : `lib/audio/instrumentFactory.ts` - Crée les instances d'engines selon le type.

### Bibliothèque de samples (Audiothèque)

Système de gestion des samples audio stockés sur Cloudflare R2.

```
stores/
├── audioLibraryStore.ts   # Fetch samples API + gestion buffers
└── sampleCacheStore.ts    # Cache IndexedDB (500MB, LRU)
```

#### audioLibraryStore - API

```typescript
// État
packs: SamplePack[]                    // Packs chargés
samples: Map<string, AudioSample>      // Samples indexés par ID
buffers: Map<string, AudioBuffer>      // AudioBuffers décodés
loadingStates: Map<string, LoadingState>  // "idle" | "loading" | "ready" | "error"

// Fetch depuis API
fetchPacksFromApi(page, limit): SamplePack[]
fetchPackDetails(slug): SamplePack | null
fetchFolderSamples(packSlug, folderId): AudioSample[]

// Chargement audio
loadSample(sampleId): AudioBuffer | null  // Charge depuis R2 + cache IndexedDB
preloadPack(packId): void                 // Précharge tous les samples d'un pack
```

#### sampleCacheStore (IndexedDB)

Cache LRU avec limite de 500MB.

```typescript
get(sampleId): ArrayBuffer | null     // Récupère depuis cache
set(sampleId, arrayBuffer): void      // Stocke + éviction LRU si nécessaire
delete(sampleId): void
clear(): void
```

#### Flow de chargement

```
User sélectionne sample
  → audioLibraryStore.loadSample(sampleId)
    → Check buffers Map (déjà décodé?)
    → Check IndexedDB cache (déjà téléchargé?)
    → Fetch depuis CDN R2 (sample.fullUrl)
    → Store dans IndexedDB
    → Decode AudioBuffer
    → Store dans buffers Map
    → Génère waveformData
```

#### Routing Audio par piste (`trackAudioStore`)

Chaque piste a sa propre chaîne audio :

```
Engine → GainNode (volume) → EQ Filters (5 bandes) → DryGain → inputBus
                                                   → WetGain → Convolver (reverb partagé)
```

- **EQ 5 bandes** : Sub (60Hz), Bass (200Hz), Mid (1000Hz), Presence (3000Hz), Brilliance (10000Hz)
- **Reverb** : Convolver partagé avec dry/wet mixing par piste
- Les watchers synchronisent automatiquement les changements du store vers les nodes audio

### Composants

#### Timeline (`components/app/timeline/`)

| Composant            | Rôle                                               |
| -------------------- | -------------------------------------------------- |
| `TimelineView.vue`   | Orchestrateur : câble les composables ci-dessous, CRUD pistes, raccourcis clavier, template/style |
| `TrackRow.vue`       | Header + preview notes + piano roll inline         |
| `TimelineRuler.vue`  | Marqueurs de mesures cliquables                    |
| `AddTrackButton.vue` | Menu de sélection d'instrument                     |

**Composables** (`composables/timelineView/`) — même principe que `composables/pianoGrid/*` :
- `useTimelinePlaybackEngine` - boucle rAF, déclenchement notes/clips, métronome, automation
- `useTimelineExport` - export WAV/MP3 (modal, capture PCM, progress)
- `useTimelineVoiceRecording` - enregistrement voix (device picker, décodage, upload sample, création clip)
- `useTimelineFileDrop` - drag & drop de fichiers audio sur la timeline
- `useTimelineProjectMeta` - nom de projet, sauvegarde, clonage, rechargement (route + lecture seule)

Le playback engine, l'export et l'enregistrement voix dépendent l'un de l'autre (l'export doit interrompre la boucle, arrêter la lecture doit finaliser un enregistrement en cours) : `TimelineView.vue` casse ce cycle avec deux callbacks (`onLoopEnd`, `onStop`) câblés une fois les 3 composables construits.

#### Piano Roll (`components/app/timeline/PianoRoll/`)

> Voir [PianoRoll/CLAUDE.md](timeline/PianoRoll/CLAUDE.md) pour la documentation complète.

| Composant        | Rôle                                          |
| ---------------- | --------------------------------------------- |
| `PianoRoll.vue`  | Orchestrateur : audio preview, history, emits |
| `PianoGrid.vue`  | Grille interactive (notes, drag, resize...)   |
| `PianoKeys.vue`  | Clavier vertical avec preview au clic         |

**Composables** (`composables/pianoGrid/`) :
- `usePianoGridSelection` - selectedNotes + marquee selection
- `usePianoGridDrag` - drag groupé avec preview
- `usePianoGridResize` - resize groupé avec preview
- `usePianoGridClipboard` - copy/paste/duplicate
- `usePianoGridKeyboard` - raccourcis clavier

#### Instruments (`components/app/instruments/`)

| Composant                | Rôle                                                    |
| ------------------------ | ------------------------------------------------------- |
| `InstrumentSettings.vue` | Panneau latéral : volume, reverb, EQ graphique, options |
| `TrackEqualizer.vue`     | Canvas EQ 5 bandes interactif (drag points)             |

### Vue principale

`views/app/BloopApp.vue` - Wrapper simple autour de `TimelineView`

> **Note** : `BloopNoteSequencer.vue` (ancien séquenceur legacy) a été supprimé. Toute la logique est maintenant dans la timeline V2.

## Flow utilisateur

1. **Ajouter une piste** : Bouton "+" → Menu instruments (BasicSynth, Smplr, Undertale, AudioTrack)
2. **Éditer les notes** : Double-clic sur la timeline d'une piste → Piano roll s'expand en dessous
3. **Ajouter une note** : Clic simple sur la grille du piano roll
4. **Supprimer une note** : Clic droit sur la note
5. **Sélection multiple** : Ctrl/Cmd+clic sur les notes ou Ctrl/Cmd+drag pour marquee
6. **Drag/Resize** : Glisser les notes sélectionnées / handle à droite
7. **Copy/Paste** : Ctrl+C, Ctrl+V (colle à la position souris), Ctrl+D (duplicate à droite)
8. **Déplacer notes** : Shift+flèches (1 step), Ctrl/Cmd+↑↓ (1 octave)
9. **Undo/Redo** : Ctrl+Z / Ctrl+Shift+Z (par piste, persiste même si piano roll fermé)
10. **Configurer l'instrument** : Clic sur ⚙ d'une piste → Panneau latéral
11. **Playback** : Toutes les pistes jouent simultanément (respect mute/solo)

## Constantes partagées

### Timeline/UI
Définies dans `TimelineView.vue` et passées en props aux enfants (`TrackRow`, `TimelineRuler`, `MasterTrackRow`) — pas de fichier de constantes partagé pour la timeline (contrairement au piano roll, voir plus bas).
```typescript
const COL_WIDTH = 20;            // Largeur d'une colonne (1 step)
const TRACK_HEADER_WIDTH = 180;  // Header sticky
const TRACK_PREVIEW_HEIGHT = 60; // Hauteur preview notes
```

### Piano Roll (`lib/audio/pianoRollConstants.ts`)
```typescript
TOTAL_NOTES = 87              // Notes disponibles (C0-B7)
NOTE_ROW_HEIGHT = 16          // Hauteur d'une note
NOTE_NAMES_DESCENDING         // ["B", "A#", "A", ...]
WHITE_KEY_MULTIPLIERS         // Hauteurs relatives des touches blanches
ALL_NOTES: NoteName[]         // Toutes les notes générées
isBlackKey(noteName)          // Vérifie si note noire
isOctaveStart(noteName)       // Vérifie si C (début d'octave)
getOctaveNumber(noteName)     // Extrait le numéro d'octave
noteIndexToName(index)        // Index → NoteName
getWhiteKeys() / getBlackKeys()
```

### Audio Config (`lib/audio/config.ts`)
```typescript
DEFAULT_EQ_BANDS              // EQ 5 bandes par défaut
createEQFilter(ctx, band)     // Crée un filtre BiquadFilterNode
createEQFilterChain(ctx, bands) // Crée une chaîne complète { filters, chain }
createImpulseResponse(ctx)    // Génère un buffer reverb
cloneEQBands()                // Clone profond des bandes EQ
```

## Points d'attention

### Bugs potentiels / À tester

- [ ] Synchronisation audio multi-pistes (timing précis)
- [x] Gestion mémoire des engines (dispose correct)
- [ ] Persistance localStorage avec le nouveau format v4.0
- [ ] ElementarySynth non implémenté (fallback sur BasicSynth)

### Bugs résolus

- **SmplrEngine pas de son** : Ne pas utiliser `markRaw()` sur l'objet Soundfont de smplr
- **Délai première note** : Système de preload implémenté
- **Fuites mémoire engines** : Cleanup complet dans `dispose()` (clear des Maps, stateCallbacks)
- **Watchers accumulation** : trackAudioStore stocke et cleanup les watchers dans `dispose()`
- **Type safety** : Discriminated unions pour InstrumentConfig, pas de `any` dans projectStore

### Fonctionnalités manquantes

- [x] Drag & drop des notes (groupé avec preview)
- [x] Resize des notes (groupé avec preview)
- [x] Copier/coller de notes (Ctrl+C/V/D)
- [x] Undo/redo par piste (Ctrl+Z/Shift+Z, persiste si piano roll fermé)
- [x] Sélection multiple (Ctrl+clic + marquee selection)
- [ ] Export audio (WAV/MP3)
- [x] EQ/Reverb par piste (dans InstrumentSettings)
- [ ] Zoom timeline
- [ ] ADSR pour ElementarySynth
- [x] Undertale soundfont engine avec ADSR
- [ ] Audio tracks (pistes samples) - en cours
- [x] Bibliothèque de samples connectée à R2/CDN
- [x] Cache IndexedDB pour samples (500MB, LRU)

## Conventions de code

- **Stores** : Pinia avec Composition API
- **Composants** : Vue 3 `<script setup>` + TypeScript
- **Audio** : Classes TypeScript pures (pas de dépendance Vue)
- **Styling** : SCSS scoped avec variables CSS (`--color-*`)

### Pour ajouter un nouvel Engine

1. Créer un dossier `engines/mon-engine/`
2. Créer `MonEngine.ts` qui `extends BaseEngine`
3. Implémenter les méthodes abstraites : `preload()`, `playNote()`, `stopNote()`, `stopAllNotes()`, `updateConfig()`, `dispose()`
4. Créer `index.ts` pour re-exporter
5. Ajouter les re-exports dans `engines/index.ts`
6. Ajouter le case dans `instrumentFactory.ts`

## Commandes utiles

```bash
npm run dev          # Serveur de développement
npm run build        # Build production
npm run lint:webapp  # Lint du frontend
```

## Dépendances clés

- `smplr` : Soundfonts pour les instruments samplés
- `pinia` : State management
