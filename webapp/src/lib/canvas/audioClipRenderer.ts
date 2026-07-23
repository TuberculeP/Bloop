import {
  ticksPerBar,
  getVisibleTickRange,
  getVisibleSubdivisionTicks,
  tickToGridLineX,
} from "../audio/timeGrid";
import type { TimeSignature } from "../utils/types";

export interface ClipRenderConfig {
  cols: number;
  colWidth: number;
  rowHeight: number;
  timeSignature: TimeSignature;
  subdivision: number;
}

export interface ClipRenderData {
  id: string;
  x: number;
  w: number;
  // Fenêtre à afficher dans waveformData, en secondes NATIVES du sample
  // (déjà résolue par l'appelant via computeClipPlaybackParams — tient
  // compte du stretch BPM-synchronisé, contrairement à startOffset/w bruts
  // qui ne représentent la fenêtre native que pour un clip non stretché).
  waveformOffsetSeconds: number;
  waveformDurationSeconds: number;
  sampleDurationSeconds: number;
  waveformData: number[] | null;
  color: string;
  name: string;
  isSelected: boolean;
  isDragging: boolean;
  isResizing: boolean;
  previewX?: number;
  previewW?: number;
}

// Géométrie minimale pour le hit-testing (mousedown/mousemove) : un
// AudioClip brut (id/x/w) la satisfait déjà telle quelle, sans wrapper — le
// hit-testing tourne à chaque mousemove, contrairement au rendu (throttlé par
// rAF), donc pas question d'y construire waveform/couleur/nom pour rien.
export interface ClipHitTestData {
  id: string;
  x: number;
  w: number;
  previewX?: number;
  previewW?: number;
}

export interface SelectionRectData {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Canvas ne résout pas les custom properties CSS (var(...)) : valeurs
// littérales reprises de --color-accent3-rgb/--color-audio-clip-selected/
// --color-status-error (webapp/src/styles/colors.css), comme pianoGridRenderer.ts.
const COLORS = {
  subdivisionLine: "rgba(122, 15, 62, 0.12)",
  measureLine: "rgba(122, 15, 62, 0.3)",
  clipSelectedOutline: "#fbbf24",
  clipDraggingOutline: "#fbbf24",
  clipLabel: "rgba(255, 255, 255, 0.9)",
  placeholderStripe: "rgba(255, 255, 255, 0.1)",
  playbackCursor: "#ef4444",
  selectionRectBorder: "#fbbf24",
  selectionRectFill: "rgba(251, 191, 36, 0.1)",
};

const BAR_WIDTH = 2;
const BAR_GAP = 1;
const MIN_BAR_HEIGHT = 2;
const CLIP_PADDING_Y = 8;
const RESIZE_HANDLE_WIDTH = 8;

export class AudioClipRenderer {
  private ctx: CanvasRenderingContext2D;
  private config: ClipRenderConfig;
  private width: number;
  private height: number;
  private visibleTickRange: [number, number] = [0, 0];

  constructor(
    ctx: CanvasRenderingContext2D,
    config: ClipRenderConfig,
    width: number,
    height: number,
  ) {
    this.ctx = ctx;
    this.config = config;
    this.width = width;
    this.height = height;
  }

  updateConfig(config: ClipRenderConfig, width: number, height: number) {
    this.config = config;
    this.width = width;
    this.height = height;
  }

  render(
    clips: ClipRenderData[],
    selectionRect: SelectionRectData | null,
    playbackPosition: number,
    isPlaying: boolean,
    scrollLeft: number,
  ) {
    const { ctx } = this;
    this.visibleTickRange = getVisibleTickRange(
      scrollLeft,
      this.width,
      this.config.colWidth,
      this.config.cols,
    );

    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(-scrollLeft, 0);

    this.drawGridLines();
    this.drawClips(clips);

    if (isPlaying) {
      this.drawPlaybackCursor(playbackPosition);
    }
    if (selectionRect) {
      this.drawSelectionRect(selectionRect);
    }

    ctx.restore();
  }

  private drawGridLines() {
    const { ctx, config } = this;
    const [tickStart, tickEnd] = this.visibleTickRange;
    const barLength = ticksPerBar(config.timeSignature);

    ctx.lineWidth = 1;

    ctx.strokeStyle = COLORS.subdivisionLine;
    ctx.beginPath();
    const subdivisionTicks = getVisibleSubdivisionTicks(
      tickStart,
      tickEnd,
      config.subdivision,
      barLength,
    );
    for (const tick of subdivisionTicks) {
      const x = tickToGridLineX(tick, config.colWidth);
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    ctx.stroke();

    ctx.strokeStyle = COLORS.measureLine;
    ctx.beginPath();
    const firstBar = Math.floor(tickStart / barLength);
    const lastBar = Math.min(
      Math.ceil(config.cols / barLength),
      Math.ceil(tickEnd / barLength),
    );
    for (let bar = firstBar; bar <= lastBar; bar++) {
      const x = tickToGridLineX(bar * barLength, config.colWidth);
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    ctx.stroke();
  }

  private drawClips(clips: ClipRenderData[]) {
    const [tickStart, tickEnd] = this.visibleTickRange;

    for (const clip of clips) {
      const x = clip.previewX ?? clip.x;
      const w = clip.previewW ?? clip.w;
      if (x + w < tickStart || x > tickEnd) continue;
      this.drawClip(clip);
    }
  }

  private drawClip(clip: ClipRenderData) {
    const { ctx, config } = this;

    const clipX = clip.previewX ?? clip.x;
    const clipW = clip.previewW ?? clip.w;

    const px = clipX * config.colWidth;
    const pw = clipW * config.colWidth;
    const py = CLIP_PADDING_Y;
    const ph = config.rowHeight - CLIP_PADDING_Y * 2;

    ctx.globalAlpha = clip.isDragging || clip.isResizing ? 0.8 : 1;

    ctx.fillStyle = clip.color;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 4);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, pw, ph);
    ctx.clip();

    if (clip.waveformData) {
      this.drawClipWaveform(clip, { px, py, pw, ph });
    } else {
      this.drawLoadingPlaceholder(px, py, pw, ph);
    }

    if (pw > 32) {
      ctx.fillStyle = COLORS.clipLabel;
      ctx.font = "500 11px system-ui, sans-serif";
      ctx.fillText(clip.name, px + 8, py + 13);
    }

    ctx.restore();

    if (clip.isSelected) {
      ctx.strokeStyle = COLORS.clipSelectedOutline;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
    } else if (clip.isDragging || clip.isResizing) {
      ctx.setLineDash([4, 2]);
      ctx.strokeStyle = COLORS.clipDraggingOutline;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
      ctx.setLineDash([]);
    }

    ctx.globalAlpha = 1;
  }

  // Porte la logique de dessin de barres de l'ancien WaveformCanvas.vue :
  // moyenne d'amplitude par barre sur la portion de `waveformData` (1000
  // points, fixe par sample) visible. La fenêtre (offset/durée) est déjà
  // résolue par l'appelant en secondes NATIVES du sample (via
  // computeClipPlaybackParams), donc correcte aussi bien pour un clip trimmé
  // que pour un clip stretché (BPM-synchronisé) — sans ça, la waveform d'un
  // clip stretché afficherait la mauvaise portion du sample, sans rapport
  // avec ce qui est réellement audible.
  private drawClipWaveform(
    clip: ClipRenderData,
    rect: { px: number; py: number; pw: number; ph: number },
  ) {
    const { ctx } = this;
    const {
      waveformData,
      color,
      sampleDurationSeconds,
      waveformOffsetSeconds,
      waveformDurationSeconds,
    } = clip;
    const { px, py, pw, ph } = rect;
    if (!waveformData || waveformData.length === 0) return;

    const startRatio =
      sampleDurationSeconds > 0
        ? waveformOffsetSeconds / sampleDurationSeconds
        : 0;
    const endRatio =
      sampleDurationSeconds > 0
        ? Math.min(
            1,
            (waveformOffsetSeconds + waveformDurationSeconds) /
              sampleDurationSeconds,
          )
        : 1;

    const startIndex = Math.floor(startRatio * waveformData.length);
    const endIndex = Math.ceil(endRatio * waveformData.length);
    const visibleData = waveformData.slice(startIndex, endIndex);
    if (visibleData.length === 0) return;

    const midY = py + ph / 2;
    const barStep = BAR_WIDTH + BAR_GAP;

    // Portion de la fenêtre demandée qui tombe réellement dans le sample —
    // si elle dépasse la fin du fichier (ex. trim au-delà du contenu
    // disponible), les barres s'arrêtent avant la fin de la box plutôt que
    // d'afficher du silence comme si c'était du contenu réel.
    const availableDurationSeconds = Math.max(
      0,
      Math.min(
        waveformDurationSeconds,
        sampleDurationSeconds - waveformOffsetSeconds,
      ),
    );
    const audioPixelWidth =
      waveformDurationSeconds > 0
        ? pw * (availableDurationSeconds / waveformDurationSeconds)
        : pw;
    const barCount = Math.max(0, Math.floor(audioPixelWidth / barStep));
    if (barCount === 0) return;

    ctx.fillStyle = this.lightenHex(color, 0.65);

    for (let i = 0; i < barCount; i++) {
      const dataStart = Math.floor((i / barCount) * visibleData.length);
      const dataEnd = Math.max(
        dataStart + 1,
        Math.floor(((i + 1) / barCount) * visibleData.length),
      );

      let amplitude = 0;
      for (let j = dataStart; j < dataEnd; j++) {
        amplitude = Math.max(amplitude, visibleData[j]);
      }

      const barHeight = Math.max(
        MIN_BAR_HEIGHT,
        amplitude * (ph / 2) * 0.85 * 2,
      );
      const x = px + i * barStep;
      ctx.fillRect(x, midY - barHeight / 2, BAR_WIDTH, barHeight);
    }
  }

  private lightenHex(hex: string, ratio: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return "rgba(255,255,255,0.7)";
    const mix = (channel: number) =>
      Math.round(channel + (255 - channel) * ratio);
    const r = mix(parseInt(result[1], 16));
    const g = mix(parseInt(result[2], 16));
    const b = mix(parseInt(result[3], 16));
    return `rgb(${r},${g},${b})`;
  }

  // Le rectangle du clip est déjà posé comme zone de clip par l'appelant
  // (drawClip) : pas besoin de save/clip/restore imbriqué ici.
  private drawLoadingPlaceholder(
    px: number,
    py: number,
    pw: number,
    ph: number,
  ) {
    const { ctx } = this;
    ctx.strokeStyle = COLORS.placeholderStripe;
    ctx.lineWidth = 4;
    const stripeGap = 8;
    ctx.beginPath();
    for (let x = px - ph; x < px + pw; x += stripeGap) {
      ctx.moveTo(x, py + ph);
      ctx.lineTo(x + ph, py);
    }
    ctx.stroke();
  }

  private drawPlaybackCursor(playbackPosition: number) {
    const { ctx, config } = this;
    const x = playbackPosition * config.colWidth;
    ctx.strokeStyle = COLORS.playbackCursor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, this.height);
    ctx.stroke();
  }

  private drawSelectionRect(rect: SelectionRectData) {
    const { ctx } = this;
    ctx.fillStyle = COLORS.selectionRectFill;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    ctx.setLineDash([]);
    ctx.strokeStyle = COLORS.selectionRectBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }

  getClipAtPosition<T extends ClipHitTestData>(
    worldX: number,
    worldY: number,
    clips: T[],
  ): T | null {
    const { config } = this;
    if (worldY < 0 || worldY > config.rowHeight) return null;

    const col = worldX / config.colWidth;

    for (let i = clips.length - 1; i >= 0; i--) {
      const clip = clips[i];
      const clipX = clip.previewX ?? clip.x;
      const clipW = clip.previewW ?? clip.w;

      if (col >= clipX && col < clipX + clipW) {
        return clip;
      }
    }
    return null;
  }

  isOnResizeHandle(
    worldX: number,
    clip: ClipHitTestData,
  ): "left" | "right" | null {
    const { config } = this;
    const clipX = clip.previewX ?? clip.x;
    const clipW = clip.previewW ?? clip.w;

    const leftEdge = clipX * config.colWidth;
    const rightEdge = (clipX + clipW) * config.colWidth;

    if (worldX >= leftEdge && worldX <= leftEdge + RESIZE_HANDLE_WIDTH) {
      return "left";
    }
    if (worldX >= rightEdge - RESIZE_HANDLE_WIDTH && worldX <= rightEdge) {
      return "right";
    }
    return null;
  }
}
