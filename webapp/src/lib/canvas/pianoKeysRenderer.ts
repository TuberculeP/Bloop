import type { NoteName } from "../utils/types";
import {
  NOTE_ROW_HEIGHT,
  WHITE_KEY_MULTIPLIERS,
  isOctaveStart,
  getWhiteKeys,
  getBlackKeys,
  ALL_NOTES,
} from "../audio/pianoRollConstants";

export interface PianoKeysRenderConfig {
  width: number;
  height: number;
  activeNotes: Set<NoteName>;
}

interface KeyRect {
  note: NoteName;
  x: number;
  y: number;
  w: number;
  h: number;
  isBlack: boolean;
}

const COLORS = {
  whiteKey: {
    fill: "#f0f0f0",
    fillHover: "#fff",
    fillActive: "#d7266d",
    border: "#bbb",
    octaveBorder: "#222",
    text: "rgba(0, 0, 0, 0.25)",
    textActive: "#fff",
    octaveText: "rgba(0, 0, 0, 0.3)",
  },
  blackKey: {
    fill: "#1a1a1a",
    fillHover: "#2a2a2a",
    fillActive: "#9b2458",
    text: "rgba(255, 255, 255, 0.25)",
    textActive: "#fff",
  },
};

export class PianoKeysRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private keyRects: KeyRect[] = [];
  private whiteKeys: NoteName[];
  private blackKeys: NoteName[];
  private allNotes: NoteName[];
  private hoveredKey: NoteName | null = null;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.whiteKeys = getWhiteKeys();
    this.blackKeys = getBlackKeys();
    this.allNotes = ALL_NOTES;
    this.buildKeyRects();
  }

  updateSize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.buildKeyRects();
  }

  setHoveredKey(note: NoteName | null) {
    this.hoveredKey = note;
  }

  private buildKeyRects() {
    this.keyRects = [];

    for (let i = 0; i < this.whiteKeys.length; i++) {
      const note = this.whiteKeys[i];
      const noteName = note.replace(/\d+$/, "");
      let top = 0;
      for (let j = 0; j < i; j++) {
        const prevNote = this.whiteKeys[j];
        const prevName = prevNote.replace(/\d+$/, "");
        top += WHITE_KEY_MULTIPLIERS[prevName] * NOTE_ROW_HEIGHT;
      }
      const h = WHITE_KEY_MULTIPLIERS[noteName] * NOTE_ROW_HEIGHT;

      this.keyRects.push({
        note,
        x: 0,
        y: top,
        w: this.width,
        h,
        isBlack: false,
      });
    }

    for (const note of this.blackKeys) {
      const noteIndex = this.allNotes.indexOf(note);
      this.keyRects.push({
        note,
        x: 0,
        y: noteIndex * NOTE_ROW_HEIGHT,
        w: this.width * 0.55,
        h: NOTE_ROW_HEIGHT,
        isBlack: true,
      });
    }
  }

  render(activeNotes: Set<NoteName>, scrollTop = 0) {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.width, this.height);

    // Marge d'une ligne de part et d'autre de la plage strictement visible,
    // comme pianoGridRenderer.ts, pour éviter un effet de bord à la frontière
    // du viewport.
    const visibleTop = scrollTop - NOTE_ROW_HEIGHT;
    const visibleBottom = scrollTop + this.height + NOTE_ROW_HEIGHT;

    ctx.save();
    ctx.translate(0, -scrollTop);

    const whiteKeyRects = this.keyRects.filter(
      (k) => !k.isBlack && k.y + k.h >= visibleTop && k.y <= visibleBottom,
    );
    const blackKeyRects = this.keyRects.filter(
      (k) => k.isBlack && k.y + k.h >= visibleTop && k.y <= visibleBottom,
    );

    for (const key of whiteKeyRects) {
      this.drawWhiteKey(key, activeNotes.has(key.note));
    }

    for (const key of blackKeyRects) {
      this.drawBlackKey(key, activeNotes.has(key.note));
    }

    ctx.restore();
  }

  private drawWhiteKey(key: KeyRect, isActive: boolean) {
    const { ctx } = this;
    const isHovered = this.hoveredKey === key.note;
    const isOctave = isOctaveStart(key.note);

    const gradient = ctx.createLinearGradient(key.w, key.y, 0, key.y);
    if (isActive) {
      gradient.addColorStop(0, COLORS.whiteKey.fillActive);
      gradient.addColorStop(1, COLORS.whiteKey.fillActive);
    } else if (isHovered) {
      gradient.addColorStop(0, "#f0f0f0");
      gradient.addColorStop(0.5, "#fff");
      gradient.addColorStop(1, "#e8e8e8");
    } else {
      gradient.addColorStop(0, "#e8e8e8");
      gradient.addColorStop(0.5, "#f5f5f5");
      gradient.addColorStop(1, "#e0e0e0");
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(key.x, key.y, key.w - 1, key.h - 1, [0, 0, 3, 3]);
    ctx.fill();

    ctx.strokeStyle = isOctave
      ? COLORS.whiteKey.octaveBorder
      : COLORS.whiteKey.border;
    ctx.lineWidth = isOctave ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(key.x, key.y + key.h - 1);
    ctx.lineTo(key.x + key.w, key.y + key.h - 1);
    ctx.stroke();

    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isActive
      ? COLORS.whiteKey.textActive
      : COLORS.whiteKey.text;
    ctx.fillText(key.note, key.w - 6, key.y + key.h / 2);
  }

  private drawBlackKey(key: KeyRect, isActive: boolean) {
    const { ctx } = this;
    const isHovered = this.hoveredKey === key.note;

    const gradient = ctx.createLinearGradient(
      key.x,
      key.y,
      key.x,
      key.y + key.h,
    );
    if (isActive) {
      gradient.addColorStop(0, COLORS.blackKey.fillActive);
      gradient.addColorStop(1, COLORS.blackKey.fillActive);
    } else if (isHovered) {
      gradient.addColorStop(0, "#3a3a3a");
      gradient.addColorStop(0.6, "#2a2a2a");
      gradient.addColorStop(1, "#1a1a1a");
    } else {
      gradient.addColorStop(0, "#2a2a2a");
      gradient.addColorStop(0.6, "#1a1a1a");
      gradient.addColorStop(1, "#0a0a0a");
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(key.x, key.y, key.w, key.h - 1, [0, 0, 2, 2]);
    ctx.fill();

    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = isActive
      ? COLORS.blackKey.textActive
      : COLORS.blackKey.text;
    ctx.font = "bold 8px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(key.note, key.w / 2, key.y + key.h / 2);
  }

  getKeyAtPosition(x: number, y: number): NoteName | null {
    const blackKeyRects = this.keyRects.filter((k) => k.isBlack);
    for (const key of blackKeyRects) {
      if (x >= key.x && x < key.x + key.w && y >= key.y && y < key.y + key.h) {
        return key.note;
      }
    }

    const whiteKeyRects = this.keyRects.filter((k) => !k.isBlack);
    for (const key of whiteKeyRects) {
      if (x >= key.x && x < key.x + key.w && y >= key.y && y < key.y + key.h) {
        return key.note;
      }
    }

    return null;
  }
}
