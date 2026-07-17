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
| `timelineStore`     | `stores/timelineStore.ts`     | Gestion des pistes et notes, pile d'effets, automation, état d'expansion |
| `trackAudioStore`   | `stores/trackAudioStore.ts`   | Routing audio par piste, pile d'effets, instruments        |
| `audioBusStore`     | `stores/audioBusStore.ts`     | Bus audio master, pile d'effets du master, export PCM      |
| `trackHistoryStore` | `stores/trackHistoryStore.ts` | Undo/redo par piste (snapshots), batch operations          |

#### timelineStore - API

```typescript
// État
project: TimelineProject
activeTrackId: string | null
expandedTrackId: string | null  // Quelle piste a le piano roll ouvert
lastResizedNoteWidth: number | null  // Aide d'édition éphémère (non persistée), voir PianoRoll/CLAUDE.md

// Pistes
createTrack(instrument, name?): string
deleteTrack(trackId): boolean
updateTrack(trackId, updates): boolean
setTrackMuted(trackId, muted): boolean
setTrackSolo(trackId, solo): boolean
setTrackVolume(trackId, volume): boolean

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

// Effets (pile réordonnable, tracks + master — trackId: string | "master")
addEffect(trackId, type): string | null
removeEffect(trackId, effectId): boolean
reorderEffect(trackId, fromIndex, toIndex): boolean
setEffectEnabled(trackId, effectId, enabled): boolean
updateEffectParam(trackId, effectId, paramId, value): boolean

// Automation (cible générique, tracks + master — trackId: string | "master")
addAutomationLane(target: AutomationTarget): string | null
removeAutomationLane(trackId, laneId): boolean
addAutomationPoint(trackId, laneId, point): string | null
updateAutomationPoint(trackId, laneId, pointId, updates): boolean
removeAutomationPoint(trackId, laneId, pointId): boolean
setAutomationPoints(trackId, laneId, points): boolean
```

### Types clés (`lib/utils/types.ts`)

```typescript
// InstrumentType = clé du registre d'instruments (lib/audio/instruments/registry.ts),
// forme ouverte (string) — plus une union fermée. Un nouvel instrument
// s'ajoute en s'enregistrant, sans modifier ce fichier.
InstrumentType = string

// InstrumentConfig = forme ouverte, à l'image d'EffectInstanceConfig : le
// `type` est une clé du registre, les champs spécifiques (oscillatorType,
// soundfont, attack...) vivent à plat pour rester compatibles avec les
// projets déjà sauvegardés.
InstrumentConfig { type: string, gain?: number, [key: string]: unknown }

// Types internes documentaires par engine (utilisés par chaque `definition.ts`
// et le constructeur de l'engine concerné, ne composent plus l'union
// InstrumentConfig) :
BasicSynthConfig { type: "basicSynth", oscillatorType: OscillatorType, gain? }
SmplrConfig { type: "smplr", soundfont: string, gain? }
ElementarySynthConfig { type: "elementarySynth", preset?, gain? } // legacy, voir plus bas
UndertaleConfig { type: "undertale", instrument: string, gain?, attack?, decay?, sustain?, release? }
AudioTrackConfig { type: "audioTrack", gain? }

// Pour les updates partiels : Partial<InstrumentConfig> (plus d'interface
// InstrumentConfigUpdate séparée à faire grossir à chaque nouveau type)

EQBand {
  id: string          // "sub", "bass", "mid", "presence", "brilliance"
  frequency: number   // Fréquence centrale
  gain: number        // -18 à +18 dB
  type: "lowshelf" | "peaking" | "highshelf"
  label: string       // Label affiché
}

// Un effet (EQ, reverb, compressor, limiter...) dans la pile d'une piste ou
// du master — voir "Système d'effets" plus bas.
EffectInstanceConfig {
  id: string                       // uuid stable, sert d'ancre pour l'automation
  type: string                     // clé du registre : "eq5" | "reverb" | "compressor" | "limiter" | "overdrive"
  enabled: boolean                 // bypass
  params: Record<string, number>   // paramId -> valeur réelle (dB, %, etc.)
}

// Cible d'un paramètre automatisable — remplace l'ancien enum fermé
// `AutomatableParam`.
AutomationTarget {
  trackId: string | "master"
  effectId: string   // EffectInstanceConfig.id, ou "channel" (fader volume, hors pile)
  paramId: string
}

Track {
  id, name, instrument, color, volume,
  effects: EffectInstanceConfig[],  // pile d'effets réordonnable (EQ, reverb, etc.)
  muted, solo, order,
  notes: MidiNote[]   // Notes avec positions absolues sur la timeline (MIDI tracks)
  clips?: AudioClip[] // Clips audio (audio tracks uniquement)
  automationLanes: AutomationLane[]  // { id, target: AutomationTarget, points }
  createdAt, updatedAt
}

AudioClip {
  id: string
  sampleId: string    // Référence vers AudioSample
  x: number           // Position sur la timeline (en ticks, 96 ticks/temps)
  w: number           // Largeur (en ticks)
  startOffset: number // Décalage dans le sample source (en ticks)
}

AudioSample {
  id, name, packId, folder, filename,
  duration, waveformData?, fullUrl  // URL CDN R2
}

MidiNote {
  i: string    // ID unique
  x: number    // Position absolue sur la timeline (en ticks, 96 ticks/temps)
  y: number    // Hauteur de note (0-86, 0 = aigu)
  w: number    // Durée (en ticks)
}

TimeSignature {
  numerator: number    // Temps par mesure (ex: 7 pour 7/8)
  denominator: number  // Valeur du temps (1,2,4,8,16,32)
}

TimelineProject {
  name, tracks: Track[], cols, tempo,
  timeSignature: TimeSignature,  // Défaut { numerator: 4, denominator: 4 }
  subdivision: number,           // Résolution de snap (pas/temps), défaut 4 — UI uniquement, ne change pas le stockage des notes
  volume,
  effects: EffectInstanceConfig[],  // pile d'effets du bus master (EQ, reverb, compressor, limiter...)
  automationLanes?: AutomationLane[],
  version: "6.0", createdAt, updatedAt
}

TRACK_COLORS // Palette de couleurs pour les pistes
DEFAULT_EQ_BANDS // EQ 5 bandes par défaut (via cloneEQBands())
```

Les positions (`x`/`w`/`cols`/`startOffset`) sont stockées dans une grille fixe en
**ticks** (`TICKS_PER_BEAT = 96`, voir `lib/audio/timeGrid.ts`), indépendante de la
signature rythmique et de la subdivision — ces deux derniers champs ne changent
que l'affichage de la grille/du snap, jamais la position réelle des notes
existantes. Les anciens projets (positions en "colonnes", 1 colonne = 1
double-croche) sont migrés automatiquement au chargement (`timelineStore.ts`,
`migrateLegacyProject`).

### Registre d'instruments (`lib/audio/instruments/`)

Registre extensible façon plugin, sur le modèle du [système d'effets](#système-deffets-libaudioeffects) (même esprit "proche de WAM dans la forme") — remplace l'ancien switch fermé. Contrairement aux effets (paramètres strictement numériques), les instruments ont aussi des réglages à choix fermé (waveform, soundfont, preset), d'où un discriminant `kind` sur les métadonnées :

```
lib/audio/instruments/
  types.ts     # InstrumentParamMeta = NumericInstrumentParamMeta ("number") | EnumInstrumentParamMeta ("enum")
               # EnumInstrumentParamMeta.options: Option[] | "dynamic" (liste connue seulement après
               # chargement d'une ressource par l'engine, ex: presets Undertale — résolue via
               # InstrumentEngine.getParamOptions(paramId))
  registry.ts  # InstrumentDefinition { type, label, icon?, params, createDefaultConfig(), engine }
               # registerInstrument/getInstrumentDefinition/listInstrumentDefinitions/createInstrumentEngine
  index.ts     # Enregistre les 4 instruments intégrés au chargement du module
```

Chaque `InstrumentDefinition` concrète est colocalisée avec son engine (`engines/basic-synth/definition.ts`, etc.) plutôt que regroupée ici — le registre reste générique, les détails (bornes ADSR, liste de soundfonts) sont propres à chaque engine.

`lib/audio/instrumentFactory.ts` reste le point d'entrée utilisé par les stores (signature stable) : adaptateur fin qui délègue au registre pour tout type connu, et garde en dur le seul cas legacy `elementarySynth → BasicSynthEngine` (jamais eu de vrai moteur, plus proposé à la création — voir plus bas).

### Engines Audio (`lib/audio/engines/`)

Architecture modulaire avec classe de base abstraite :

```
engines/
  types.ts              # InstrumentEngine, EngineState, EngineStateCallback, getParamOptions?()
  BaseEngine.ts         # Classe abstraite avec state management
  noteUtils.ts          # noteNameToFrequency() partagé
  index.ts              # Re-exports publics

  basic-synth/
    BasicSynthEngine.ts # Oscillateurs Web Audio (toujours ready)
    definition.ts        # InstrumentDefinition (enum oscillatorType)

  smplr/
    SmplrEngine.ts      # Soundfonts via `smplr` (128+ instruments)
    soundfonts.ts       # SOUNDFONT_LIST + SoundfontName
    definition.ts        # InstrumentDefinition (enum soundfont, options dérivées de SOUNDFONT_LIST)

  undertale/
    UndertaleEngine.ts  # Soundfont custom Undertale avec ADSR, getParamOptions("instrument")
    definition.ts        # InstrumentDefinition (enum instrument "dynamic" + 4 params ADSR numériques)

  audio-clip/
    AudioClipEngine.ts  # Lecture de clips audio (pas de synthèse)
    definition.ts        # InstrumentDefinition (params: [])
```

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

Chaque piste a sa propre chaîne audio, le volume restant hors de la pile d'effets (fader de channel strip, pas un insert réordonnable) :

```
Engine → GainNode (volume) → EffectChain (pile réordonnable) → inputBus
```

Le bus master suit la même logique dans `audioBusStore` : `inputBus → masterGain (volume) → EffectChain → destination`. Les deux stores partagent la même classe `EffectChain` (`lib/audio/effects/effectChain.ts`) — voir "Système d'effets" ci-dessous. Les watchers (scindés en un watcher structurel + un watcher de valeurs, voir le fichier) synchronisent automatiquement les changements du store vers les nodes audio.

### Système d'effets (`lib/audio/effects/`)

Pile d'effets réordonnable, commune aux pistes et au bus master (remplace l'ancien câblage figé EQ/Reverb/Compressor/Limiter). Interface volontairement proche, dans la forme, de Web Audio Modules (WAM) — sans viser sa conformité — pour garder la porte ouverte à un futur adaptateur de plugins tiers.

```
lib/audio/effects/
  types.ts        # EffectInstance { id, type, input, output, getParams(), getParam(), dispose() }
                  # EffectParamDescriptor (vivant, lié à l'audio) / EffectParamMeta (statique, pour l'UI)
  registry.ts     # registerEffect/getEffectDefinition/listEffectDefinitions/createEffectInstance
  effectChain.ts  # class EffectChain — reconstruction dynamique du graphe (rebuild/setEnabled/getParamDescriptor)
  eq5.ts, reverb.ts, compressor.ts, limiter.ts, overdrive.ts  # effets intégrés
  index.ts        # enregistre les 4 effets au chargement du module
```

- Chaque effet expose uniquement `{input, output}` + une liste de `EffectParamDescriptor` — le bypass (crossfade dry/wet sans clic) est géré une seule fois par `EffectChain`, pas par chaque effet.
- La Reverb : IR générée une seule fois (`AudioBuffer` partagé), mais chaque instance a son propre `ConvolverNode` — contrôle indépendant par instance sans regénérer l'IR.
- `EffectChain.rebuild(configs)` ne doit être appelé que sur ajout/suppression/réordre/bypass (rare) ; les changements de valeur de param passent par un watcher séparé qui écrit directement sur l'`AudioParam`/`setValue`, sans rebuild.
- UI : `components/app/effects/{EffectRack,EffectSlot,EffectParamRow}.vue` — liste compacte par effet (nom, bypass, drag-to-reorder natif HTML5, supprimer), dépliable inline pour éditer les params (pas de modale séparée). Réutilisé identiquement par `InstrumentSettings.vue` (tracks) et `MasterSettings.vue` (master).
- Automation généralisée : `AutomationTarget` (voir Types) remplace l'ancien enum fermé — n'importe quel paramètre de n'importe quel effet peut être automatisé. Une lane s'ajoute/se retire directement depuis le bouton "automatiser" de `EffectParamRow.vue` (plus de menu déroulant séparé dans le drawer d'automation) ; le drawer (`TrackRow.vue`/`MasterTrackRow.vue`) ne fait plus qu'afficher les lanes existantes et permettre leur suppression.

Pour ajouter un nouvel effet : créer `lib/audio/effects/monEffet.ts` exportant un `EffectDefinition` (type, label, category, params: EffectParamMeta[], createDefaultParams(), create()), puis l'enregistrer dans `index.ts` via `registerEffect(...)`.

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
| `PianoRoll.vue`        | Orchestrateur : audio preview, history, emits |
| `PianoGridCanvas.vue`  | Grille interactive (notes, drag, resize...)   |
| `PianoKeys.vue`        | Clavier vertical avec preview au clic         |

**Composables** (`composables/pianoGrid/`) :
- `usePianoGridSelection` - selectedNotes + marquee selection
- `usePianoGridDrag` - drag groupé avec preview
- `usePianoGridResize` - resize groupé avec preview
- `usePianoGridClipboard` - copy/paste/duplicate
- `usePianoGridKeyboard` - raccourcis clavier

#### Instruments (`components/app/instruments/`)

| Composant                    | Rôle                                                    |
| ----------------------------- | ------------------------------------------------------- |
| `InstrumentSettings.vue`      | Panneau latéral : volume, pile d'effets (`EffectRack`), bouton d'ouverture des réglages instrument |
| `InstrumentParamsModal.vue`   | Modale (`BaseModal`) : rendu générique des `params` de l'`InstrumentDefinition` (via `InstrumentParamField`) |
| `InstrumentParamField.vue`    | Un champ de réglage instrument, `RangeSlider` (number) ou `<select>` (enum, options statiques ou dynamiques) |
| `TrackEqualizer.vue`         | Canvas EQ 5 bandes interactif (drag points), réutilisé par `EffectSlot.vue` |

#### Effets (`components/app/effects/`)

Voir [Système d'effets](#système-deffets-libaudioeffects) plus haut. `EffectRack.vue` / `EffectSlot.vue` / `EffectParamRow.vue` — réutilisés par `InstrumentSettings.vue` et `MasterSettings.vue`.

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
const PX_PER_BEAT = 80;                 // Densité visuelle de référence (1 temps)
const COL_WIDTH = pxPerTick(PX_PER_BEAT); // px par tick, dérivé via lib/audio/timeGrid.ts
const TRACK_HEADER_WIDTH = 180;  // Header sticky
const TRACK_PREVIEW_HEIGHT = 60; // Hauteur preview notes
```
`colWidth` est passé partout comme "px par tick" (et non plus "px par colonne") : `x_px = x_ticks * colWidth`. Voir `lib/audio/timeGrid.ts` pour `TICKS_PER_BEAT`, `ticksPerBar`, `snapTicks`, `ticksPerSecond`.

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
- [ ] Persistance localStorage avec le nouveau format v5.0 (grille en ticks)
- [x] ElementarySynth non implémenté — retiré du catalogue "Ajouter une piste" (non enregistré dans le registre), fallback legacy sur BasicSynth conservé dans `instrumentFactory.ts` pour les pistes déjà sauvegardées avec ce type

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
- [x] Pile d'effets réordonnable (EQ/Reverb/Compressor/Limiter/Overdrive) par piste et master
- [ ] Zoom timeline
- [x] Undertale soundfont engine avec ADSR
- [ ] Audio tracks (pistes samples) - en cours
- [x] Bibliothèque de samples connectée à R2/CDN
- [x] Cache IndexedDB pour samples (500MB, LRU)

## Conventions de code

- **Stores** : Pinia avec Composition API
- **Composants** : Vue 3 `<script setup>` + TypeScript
- **Audio** : Classes TypeScript pures (pas de dépendance Vue)
- **Styling** : SCSS scoped avec variables CSS (`--color-*`)

### Pour ajouter un nouvel Engine (instrument)

1. Créer un dossier `engines/mon-engine/`
2. Créer `MonEngine.ts` qui `extends BaseEngine` — constructeur typé `config: InstrumentConfig` (narrower en interne via cast, ex. `config as MonConfig`), implémenter les méthodes abstraites : `preload()`, `playNote()`, `stopNote()`, `stopAllNotes()`, `updateConfig()`, `dispose()` (+ `getParamOptions()` si un param a des options dynamiques)
3. Créer `definition.ts` exportant un `InstrumentDefinition` (type, label, icon?, params: `InstrumentParamMeta[]`, createDefaultConfig(), engine — caster `engine: MonEngine as unknown as InstrumentEngineConstructor`, nécessaire car le constructeur concret prend un type plus étroit que `InstrumentConfig`)
4. Créer `index.ts` pour re-exporter la classe + la définition
5. Enregistrer la définition dans `lib/audio/instruments/index.ts` via `registerInstrument(...)`

Aucune modification requise dans `instrumentFactory.ts`, `AddTrackButton.vue` ni `InstrumentSettings.vue` — tous dérivent génériquement du registre (`listInstrumentDefinitions()` / `getInstrumentDefinition()`).

## Commandes utiles

```bash
npm run dev          # Serveur de développement
npm run build        # Build production
npm run lint:webapp  # Lint du frontend
```

## Dépendances clés

- `smplr` : Soundfonts pour les instruments samplés
- `pinia` : State management
