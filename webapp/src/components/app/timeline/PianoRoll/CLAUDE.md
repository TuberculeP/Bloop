# Piano Roll - Documentation Technique

> Éditeur de notes MIDI inline avec support complet du drag, resize, sélection multiple, copy/paste et undo/redo par piste.

## Architecture

```
PianoRoll/
├── PianoRoll.vue        # Orchestrateur (audio, history, emits vers parent)
├── PianoGridCanvas.vue  # Grille interactive canvas (compose les composables)
├── PianoKeysCanvas.vue  # Clavier vertical canvas avec preview audio
└── CLAUDE.md

composables/pianoGrid/
├── index.ts                    # Re-exports
├── usePianoGridSelection.ts    # selectedNotes + marquee
├── usePianoGridResize.ts       # Resize groupé
├── usePianoGridDrag.ts         # Drag groupé
├── usePianoGridClipboard.ts    # Copy/paste/duplicate
└── usePianoGridKeyboard.ts     # Raccourcis clavier

stores/
└── trackHistoryStore.ts        # Undo/redo par piste
```

## Composants

### PianoRoll.vue
**Rôle** : Orchestrateur entre PianoKeysCanvas, PianoGridCanvas et les stores.

- Reçoit `track`, `cols`, `colWidth`, `playbackPosition`, `isPlaying`
- `cols`/`colWidth` sont exprimés en ticks (`TICKS_PER_BEAT = 96`, voir `lib/audio/timeGrid.ts`), pas en "colonnes"
- Gère le **preview audio** des notes (clavier + playback)
- Utilise `trackHistoryStore` pour wrapper les mutations avec undo/redo
- Émet vers le parent : rien (mutations directes via stores)

```typescript
// Handlers clés
handleAddNote(x, y)       // trackHistoryStore.recordAddNote()
handleRemoveNote(noteId)  // trackHistoryStore.recordRemoveNote()
handleUpdateNotes(updates[]) // startBatch → mutations → endBatch
handleDeleteNotes(noteIds[]) // startBatch → mutations → endBatch
handlePasteNotes(notes[])    // startBatch → mutations → endBatch
handleUndo() / handleRedo()  // trackHistoryStore.undo/redo(trackId)
```

### PianoGridCanvas.vue
**Rôle** : Grille interactive canvas qui compose les 5 composables.

- Reçoit `notes`, `cols`, `colWidth`, `color`, `activeNotes`, `trackId`
- Émet : `add-note`, `remove-note`, `update-notes`, `delete-notes`, `paste-notes`, `undo`, `redo`
- Gère le style des notes avec preview (drag/resize en temps réel)
- Lit `timelineStore.subdivision` pour calculer le pas de snap (`snapTicks`, voir `lib/audio/timeGrid.ts`) transmis à `usePianoGridDrag`/`usePianoGridResize`/`usePianoGridClipboard`

### PianoKeysCanvas.vue
**Rôle** : Clavier vertical sticky avec preview audio.

- Reçoit `activeNotes: Set<NoteName>`, `gridHeight`
- Émet : `note-start`, `note-stop`, `all-notes-stop`
- Support du glissando (drag sur les touches)

## Composables

### usePianoGridSelection
Gère `selectedNotes` et la sélection marquee (Ctrl+drag).

```typescript
const {
  selectedNotes,           // Ref<Set<string>>
  selectionRect,           // État du rectangle de sélection
  isSelecting,             // Computed
  selectionRectStyle,      // Style CSS du rectangle
  justFinishedSelecting,   // Flag pour éviter le click après sélection
  handleSelectionStart,    // Démarre la sélection marquee
  toggleNoteSelection,     // Ctrl+clic
  clearSelection,
  removeFromSelection,
  cleanup,
} = usePianoGridSelection(notes, colWidth, gridWidth, gridHeight);
```

### usePianoGridResize
Gère le resize groupé avec preview temps réel.

```typescript
const {
  resizingState,      // { startX, notesInitialWidth: Map }
  resizePreviewDelta, // Delta actuel (en ticks, snappé sur snapStep)
  isResizing,
  isNoteResizing,     // (noteId) => boolean
  handleResizeStart,  // Démarre le resize
  cleanup,
} = usePianoGridResize(notes, selectedNotes, colWidth, cols, onResizeEnd, onInteractionEnd, snapStep);
```
`snapStep` (= `snapTicks(subdivision)`) est optionnel (défaut 1 tick) et borne l'arrondi du delta au pas de grille choisi par l'utilisateur.

### usePianoGridDrag
Gère le drag groupé avec contraintes et preview.

```typescript
const {
  dragState,          // { startMouse, notesInitialPos: Map, hasMoved, ... }
  dragPreviewDeltas,  // { dx, dy }
  isDragging,
  isNoteDragging,     // (noteId) => boolean
  handleDragStart,
  cleanup,
} = usePianoGridDrag(notes, selectedNotes, colWidth, cols, onDragEnd, onInteractionEnd, snapStep);
```
Même paramètre optionnel `snapStep` que `usePianoGridResize`.

### usePianoGridClipboard
Gère copy/paste/duplicate avec position relative.

```typescript
const {
  clipboard,              // Notes copiées (positions relatives)
  copySelectedNotes,      // Copie avec ancre bottom-left
  pasteNotes,             // Colle à position souris (snappée) + 1 pas de grille
  duplicateSelectedNotes, // Clone à droite de la sélection
} = usePianoGridClipboard(notes, selectedNotes, cols, mouseGridPos, onPaste, snapStep);
```

### usePianoGridKeyboard
Orchestre tous les raccourcis clavier.

```typescript
usePianoGridKeyboard(selectedNotes, {
  onUndo,          // Ctrl+Z
  onRedo,          // Ctrl+Shift+Z ou Ctrl+Y
  onDelete,        // Delete/Backspace
  onEscape,        // Escape (clear selection)
  onCopy,          // Ctrl+C
  onPaste,         // Ctrl+V
  onDuplicate,     // Ctrl+D
  onMoveSelection, // Shift+flèches (1 step) ou Ctrl/Cmd+flèches (1 octave)
});
```

## Store trackHistoryStore

Undo/redo par piste avec snapshots complets des notes.

```typescript
// API
undo(trackId): boolean
redo(trackId): boolean
canUndo(trackId): boolean
canRedo(trackId): boolean

// Opérations atomiques (créent 1 entrée historique)
recordAddNote(trackId, note): string | null
recordRemoveNote(trackId, noteId): boolean

// Opérations batch (plusieurs mutations = 1 entrée historique)
startBatch(trackId, description)
endBatch()
cancelBatch()

// Cleanup
clearTrackHistory(trackId)  // Appelé par timelineStore.deleteTrack()
clearAllHistory()           // Appelé par timelineStore.loadProject/createNew
```

**Architecture** :
- `Map<trackId, { undoStack, redoStack }>` - historique par piste
- Max 50 entrées par piste
- Snapshots complets (`notesBefore`, `notesAfter`) - simple et robuste
- Persiste même si le piano roll est fermé/réouvert

## Contrôles utilisateur

| Action | Interaction |
|--------|-------------|
| Ajouter note | Clic simple sur grille vide (largeur = dernier resize individuel, sinon taille de maille) |
| Ajouter note (taille de maille) | Ctrl/Cmd+clic sur grille vide |
| Supprimer note | Clic droit sur note |
| Sélectionner | Ctrl/Cmd+clic sur note |
| Sélection multiple | Shift+drag (marquee) |
| Déselectionner | Clic droit sur zone vide ou Escape |
| Drag notes | Glisser note(s) sélectionnée(s) |
| Resize notes | Glisser le handle droit |
| Copier | Ctrl+C |
| Coller | Ctrl+V (position souris + 1 pas de grille) |
| Dupliquer | Ctrl+D (clone à droite) |
| Undo | Ctrl+Z |
| Redo | Ctrl+Shift+Z ou Ctrl+Y |
| Supprimer sélection | Delete ou Backspace |
| Déplacer sélection (1 step) | Shift + ↑↓←→ |
| Déplacer sélection (1 octave) | Ctrl/Cmd + ↑↓ |
| Preview note | Clic/drag sur clavier |

## Constantes (`lib/audio/pianoRollConstants.ts`)

```typescript
TOTAL_NOTES = 87              // C0-B7
NOTE_ROW_HEIGHT = 16          // Hauteur d'une ligne
ALL_NOTES: NoteName[]         // ["B7", "A#7", ..., "C0"]
isBlackKey(noteName)
isOctaveStart(noteName)       // true si "C"
noteIndexToName(index)        // index → "C4"
getWhiteKeys() / getBlackKeys()
```

## Points d'attention

### Dépendances entre composables
- `selectedNotes` est créé par `usePianoGridSelection` et passé aux autres
- `mouseGridPos` est géré dans PianoGrid et passé à `usePianoGridClipboard`
- `justFinishedInteracting` flag partagé pour éviter les clics parasites après drag/resize/select

### Preview temps réel
- `getNoteStyle()` dans PianoGrid calcule le style avec les deltas de preview
- Les composables exposent `dragPreviewDeltas` et `resizePreviewDelta`
- Les notes en cours d'interaction ont une opacité réduite + outline dashed

### Cleanup
- Chaque composable expose `cleanup()` pour supprimer les event listeners globaux
- `onBeforeUnmount` dans PianoGrid appelle tous les cleanup

### Circular dependency évitée
- `trackHistoryStore` importe `timelineStore` dynamiquement dans certaines méthodes
- `timelineStore` utilise `import()` dynamique pour appeler `trackHistoryStore.clearHistory()`
