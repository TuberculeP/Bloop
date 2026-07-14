import {
  TOTAL_NOTES,
  NOTE_ROW_HEIGHT,
  isBlackKey,
  isOctaveStart,
  noteIndexToName,
} from "../audio/pianoRollConstants";
import { TICKS_PER_BEAT, ticksPerBar, snapTicks } from "../audio/timeGrid";
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

  render(
    notes: NoteRenderData[],
    activeRows: Set<number>,
    selectionRect: SelectionRectData | null,
  ) {
    const { ctx } = this;

    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBlackKeyRows();
    this.drawActiveRowHighlights(activeRows);
    this.drawGridLines();
    this.drawOctaveLines();
    this.drawMeasureLines();
    this.drawNotes(notes);

    if (selectionRect) {
      this.drawSelectionRect(selectionRect);
    }
  }

  private drawBlackKeyRows() {
    const { ctx } = this;

    ctx.fillStyle = COLORS.blackKeyRow;

    for (let row = 0; row < TOTAL_NOTES; row++) {
      const noteName = noteIndexToName(row);
      if (isBlackKey(noteName)) {
        const y = row * NOTE_ROW_HEIGHT;
        ctx.fillRect(0, y, this.width, NOTE_ROW_HEIGHT);
      }
    }
  }

  private drawActiveRowHighlights(activeRows: Set<number>) {
    if (activeRows.size === 0) return;

    const { ctx } = this;
    ctx.fillStyle = COLORS.activeRowHighlight;

    for (const row of activeRows) {
      const y = row * NOTE_ROW_HEIGHT;
      ctx.fillRect(0, y, this.width, NOTE_ROW_HEIGHT);
    }
  }

  private drawGridLines() {
    const { ctx, config } = this;

    ctx.strokeStyle = COLORS.cellBorderHorizontal;
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let row = 1; row <= TOTAL_NOTES; row++) {
      const y = row * NOTE_ROW_HEIGHT - 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
    }
    ctx.stroke();

    ctx.strokeStyle = COLORS.cellBorderVertical;
    ctx.beginPath();
    const step = snapTicks(config.subdivision);
    for (let tick = step; tick <= config.cols; tick += step) {
      const x = tick * config.colWidth - 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    ctx.stroke();
  }

  private drawOctaveLines() {
    const { ctx } = this;

    ctx.strokeStyle = COLORS.octaveLine;
    ctx.lineWidth = 2;

    ctx.beginPath();
    for (let row = 0; row < TOTAL_NOTES; row++) {
      const noteName = noteIndexToName(row);
      if (isOctaveStart(noteName)) {
        const y = (row + 1) * NOTE_ROW_HEIGHT - 1;
        ctx.moveTo(0, y);
        ctx.lineTo(this.width, y);
      }
    }
    ctx.stroke();
  }

  // Une ligne à chaque temps (TICKS_PER_BEAT ticks), en rose clair sur le
  // premier temps de chaque mesure (ticksPerBar selon la signature rythmique).
  private drawMeasureLines() {
    const { ctx, config } = this;

    const barLength = ticksPerBar(config.timeSignature);
    const beatCount = Math.ceil(config.cols / TICKS_PER_BEAT);

    for (let beat = 0; beat <= beatCount; beat++) {
      const tick = beat * TICKS_PER_BEAT;
      const x = tick * config.colWidth - 0.5;
      const isBarStart = tick % barLength === 0;

      ctx.beginPath();
      ctx.strokeStyle = isBarStart
        ? COLORS.metronomeBeatLine
        : COLORS.measureLine;
      ctx.lineWidth = 1;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
  }

  private drawNotes(notes: NoteRenderData[]) {
    for (const note of notes) {
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
