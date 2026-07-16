import {
  TOTAL_NOTES,
  NOTE_ROW_HEIGHT,
  isBlackKey,
  isOctaveStart,
  noteIndexToName,
} from "../audio/pianoRollConstants";
import {
  TICKS_PER_BEAT,
  ticksPerBar,
  snapTicks,
  getVisibleTickRange,
} from "../audio/timeGrid";
import type { TimeSignature } from "../utils/types";

export interface GridRenderConfig {
  cols: number;
  colWidth: number;
  trackColor: string;
  timeSignature: TimeSignature;
  subdivision: number;
}

export interface NoteRenderData {
  id: string;
  x: number;
  y: number;
  w: number;
  isSelected: boolean;
  isDragging: boolean;
  isResizing: boolean;
  previewX?: number;
  previewY?: number;
  previewW?: number;
}

export interface SelectionRectData {
  x: number;
  y: number;
  w: number;
  h: number;
}

const COLORS = {
  blackKeyRow: "rgba(0, 0, 0, 0.15)",
  octaveLine: "rgba(0, 0, 0, 0.3)",
  activeRowHighlight: "rgba(215, 38, 109, 0.15)",
  cellBorderVertical: "rgba(122, 15, 62, 0.2)",
  cellBorderHorizontal: "rgba(122, 15, 62, 0.15)",
  measureLine: "rgba(122, 15, 62, 0.5)",
  metronomeBeatLine: "rgba(170, 27, 86, 0.7)",
  noteSelectedOutline: "#fff7ab",
  noteSelectedShadow: "rgba(255, 247, 171, 0.4)",
  noteDraggingOutline: "#fff7ab",
  selectionRectBorder: "#fff7ab",
  selectionRectFill: "rgba(255, 247, 171, 0.1)",
  noteLabel: "rgba(0, 0, 0, 0.8)",
};

export class PianoGridRenderer {
  private ctx: CanvasRenderingContext2D;
  private config: GridRenderConfig;
  private width: number;
  private height: number;
  // Le canvas ne couvre plus que le viewport visible (voir usePianoGridCanvas.ts) ;
  // scrollLeft/scrollTop indiquent quelle tranche du monde (cols*colWidth ×
  // TOTAL_NOTES*NOTE_ROW_HEIGHT) afficher. Mis à jour à chaque render(), pas
  // seulement au resize, car le scroll change bien plus souvent.
  private scrollLeft = 0;
  private scrollTop = 0;
  // Calculées une seule fois par render() (au lieu d'une fois par méthode de
  // dessin) puisqu'elles ne changent pas pendant tout le pass de rendu.
  private visibleTickRange: [number, number] = [0, 0];
  private visibleRowRange: [number, number] = [0, 0];

  constructor(
    ctx: CanvasRenderingContext2D,
    config: GridRenderConfig,
    width: number,
    height: number,
  ) {
    this.ctx = ctx;
    this.config = config;
    this.width = width;
    this.height = height;
  }

  updateConfig(config: GridRenderConfig, width: number, height: number) {
    this.config = config;
    this.width = width;
    this.height = height;
  }

  // Marge d'une colonne/ligne de part et d'autre de la plage strictement
  // visible : évite qu'une note ou une poignée de resize pile à la frontière
  // du viewport disparaisse ou devienne non cliquable.
  private getVisibleRowRange(): [number, number] {
    const start = Math.max(0, Math.floor(this.scrollTop / NOTE_ROW_HEIGHT) - 1);
    const end = Math.min(
      TOTAL_NOTES,
      Math.ceil((this.scrollTop + this.height) / NOTE_ROW_HEIGHT) + 1,
    );
    return [start, end];
  }

  render(
    notes: NoteRenderData[],
    activeRows: Set<number>,
    selectionRect: SelectionRectData | null,
    scrollLeft: number,
    scrollTop: number,
  ) {
    const { ctx } = this;
    this.scrollLeft = scrollLeft;
    this.scrollTop = scrollTop;
    this.visibleTickRange = getVisibleTickRange(
      scrollLeft,
      this.width,
      this.config.colWidth,
      this.config.cols,
    );
    this.visibleRowRange = this.getVisibleRowRange();

    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(-scrollLeft, -scrollTop);

    this.drawBlackKeyRows();
    this.drawActiveRowHighlights(activeRows);
    this.drawGridLines();
    this.drawOctaveLines();
    this.drawMeasureLines();
    this.drawNotes(notes);

    if (selectionRect) {
      this.drawSelectionRect(selectionRect);
    }

    ctx.restore();
  }

  private drawBlackKeyRows() {
    const { ctx } = this;
    const [rowStart, rowEnd] = this.visibleRowRange;

    ctx.fillStyle = COLORS.blackKeyRow;

    for (let row = rowStart; row < rowEnd; row++) {
      const noteName = noteIndexToName(row);
      if (isBlackKey(noteName)) {
        const y = row * NOTE_ROW_HEIGHT;
        ctx.fillRect(this.scrollLeft, y, this.width, NOTE_ROW_HEIGHT);
      }
    }
  }

  private drawActiveRowHighlights(activeRows: Set<number>) {
    if (activeRows.size === 0) return;

    const { ctx } = this;
    const [rowStart, rowEnd] = this.visibleRowRange;
    ctx.fillStyle = COLORS.activeRowHighlight;

    for (const row of activeRows) {
      if (row < rowStart || row >= rowEnd) continue;
      const y = row * NOTE_ROW_HEIGHT;
      ctx.fillRect(this.scrollLeft, y, this.width, NOTE_ROW_HEIGHT);
    }
  }

  private drawGridLines() {
    const { ctx, config } = this;
    const [rowStart, rowEnd] = this.visibleRowRange;
    const [tickStart, tickEnd] = this.visibleTickRange;

    ctx.strokeStyle = COLORS.cellBorderHorizontal;
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let row = Math.max(1, rowStart); row <= rowEnd; row++) {
      const y = row * NOTE_ROW_HEIGHT - 0.5;
      ctx.moveTo(this.scrollLeft, y);
      ctx.lineTo(this.scrollLeft + this.width, y);
    }
    ctx.stroke();

    ctx.strokeStyle = COLORS.cellBorderVertical;
    ctx.beginPath();
    const step = snapTicks(config.subdivision);
    const firstTick = Math.max(step, Math.floor(tickStart / step) * step);
    for (let tick = firstTick; tick <= tickEnd; tick += step) {
      const x = tick * config.colWidth - 0.5;
      ctx.moveTo(x, this.scrollTop);
      ctx.lineTo(x, this.scrollTop + this.height);
    }
    ctx.stroke();
  }

  private drawOctaveLines() {
    const { ctx } = this;
    const [rowStart, rowEnd] = this.visibleRowRange;

    ctx.strokeStyle = COLORS.octaveLine;
    ctx.lineWidth = 2;

    ctx.beginPath();
    for (let row = rowStart; row < rowEnd; row++) {
      const noteName = noteIndexToName(row);
      if (isOctaveStart(noteName)) {
        const y = (row + 1) * NOTE_ROW_HEIGHT - 1;
        ctx.moveTo(this.scrollLeft, y);
        ctx.lineTo(this.scrollLeft + this.width, y);
      }
    }
    ctx.stroke();
  }

  // Une ligne à chaque temps (TICKS_PER_BEAT ticks), en rose clair sur le
  // premier temps de chaque mesure (ticksPerBar selon la signature rythmique).
  private drawMeasureLines() {
    const { ctx, config } = this;

    const barLength = ticksPerBar(config.timeSignature);
    const [tickStart, tickEnd] = this.visibleTickRange;
    const beatStart = Math.max(0, Math.floor(tickStart / TICKS_PER_BEAT));
    const beatEnd = Math.min(
      Math.ceil(config.cols / TICKS_PER_BEAT),
      Math.ceil(tickEnd / TICKS_PER_BEAT),
    );

    ctx.lineWidth = 1;

    // Un beginPath/stroke par couleur (2 au total) plutôt que par ligne : à
    // fort zoom, le nombre de temps visibles reste modeste mais chaque
    // stroke() séparé a un coût fixe non négligeable répété à chaque redraw.
    ctx.beginPath();
    ctx.strokeStyle = COLORS.measureLine;
    for (let beat = beatStart; beat <= beatEnd; beat++) {
      const tick = beat * TICKS_PER_BEAT;
      if (tick % barLength === 0) continue;
      // Math.max(0.5, ...) : le -0.5 habituel (alignement crisp sur la grille
      // de pixels) pousserait la toute première ligne (tick 0) hors du canvas
      // (x=-0.5), la rendant invisible — contrairement aux lignes de mesure
      // des pistes de clips audio (AudioClipRow.vue, en DOM, sans cet
      // artefact). On la ramène à 0.5 pour qu'elle reste visible au début.
      const x = Math.max(0.5, tick * config.colWidth - 0.5);
      ctx.moveTo(x, this.scrollTop);
      ctx.lineTo(x, this.scrollTop + this.height);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = COLORS.metronomeBeatLine;
    for (let beat = beatStart; beat <= beatEnd; beat++) {
      const tick = beat * TICKS_PER_BEAT;
      if (tick % barLength !== 0) continue;
      const x = Math.max(0.5, tick * config.colWidth - 0.5);
      ctx.moveTo(x, this.scrollTop);
      ctx.lineTo(x, this.scrollTop + this.height);
    }
    ctx.stroke();
  }

  private drawNotes(notes: NoteRenderData[]) {
    const [tickStart, tickEnd] = this.visibleTickRange;
    const [rowStart, rowEnd] = this.visibleRowRange;

    for (const note of notes) {
      const noteX = note.previewX ?? note.x;
      const noteY = note.previewY ?? note.y;
      const noteW = note.previewW ?? note.w;

      if (noteX + noteW < tickStart || noteX > tickEnd) continue;
      if (noteY < rowStart || noteY >= rowEnd) continue;

      this.drawNote(note);
    }
  }

  private drawNote(note: NoteRenderData) {
    const { ctx, config } = this;

    const x =
      note.previewX !== undefined
        ? note.previewX * config.colWidth
        : note.x * config.colWidth;
    const y =
      note.previewY !== undefined
        ? note.previewY * NOTE_ROW_HEIGHT
        : note.y * NOTE_ROW_HEIGHT;
    const w =
      note.previewW !== undefined
        ? note.previewW * config.colWidth - 2
        : note.w * config.colWidth - 2;
    const h = NOTE_ROW_HEIGHT - 2;

    const noteColor = config.trackColor;
    const noteName = noteIndexToName(note.y);
    const isBlack = isBlackKey(noteName);

    ctx.globalAlpha = note.isDragging || note.isResizing ? 0.7 : 0.9;

    ctx.fillStyle = noteColor;
    if (isBlack) {
      ctx.filter = "brightness(0.85)";
    }

    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, w, h, 2);
    ctx.fill();

    ctx.filter = "none";

    if (note.isSelected) {
      ctx.strokeStyle = COLORS.noteSelectedOutline;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.shadowColor = COLORS.noteSelectedShadow;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (note.isDragging || note.isResizing) {
      ctx.setLineDash([4, 2]);
      ctx.strokeStyle = COLORS.noteDraggingOutline;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.globalAlpha = 1;

    if (w > 12) {
      ctx.fillStyle = COLORS.noteLabel;
      const fontSize = w > 20 ? 8 : 6;
      ctx.font = `500 ${fontSize}px system-ui, sans-serif`;
      ctx.fillText(noteName, x + 3, y + h / 2 + (fontSize === 6 ? 2 : 3));
    }
  }

  private drawSelectionRect(rect: SelectionRectData) {
    const { ctx } = this;

    ctx.fillStyle = COLORS.selectionRectFill;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    ctx.setLineDash([4, 2]);
    ctx.strokeStyle = COLORS.selectionRectBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.setLineDash([]);
  }

  getNoteAtPosition(
    x: number,
    y: number,
    notes: NoteRenderData[],
  ): NoteRenderData | null {
    const { config } = this;
    const col = x / config.colWidth;
    const row = Math.floor(y / NOTE_ROW_HEIGHT);

    for (let i = notes.length - 1; i >= 0; i--) {
      const note = notes[i];
      const noteX = note.previewX ?? note.x;
      const noteY = note.previewY ?? note.y;
      const noteW = note.previewW ?? note.w;

      if (col >= noteX && col < noteX + noteW && row === noteY) {
        return note;
      }
    }
    return null;
  }

  isOnResizeHandle(x: number, note: NoteRenderData): boolean {
    const { config } = this;
    const noteW = note.previewW ?? note.w;
    const noteX = note.previewX ?? note.x;
    const noteRightEdge = (noteX + noteW) * config.colWidth;
    const handleWidth = 6;
    return x >= noteRightEdge - handleWidth && x <= noteRightEdge;
  }
}
