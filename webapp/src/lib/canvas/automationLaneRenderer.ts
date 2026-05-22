import type { AutomationPoint } from "../utils/types";
import { getAutomationValueAt } from "../audio/automation";

export interface AutomationRenderConfig {
  cols: number;
  colWidth: number;
  trackColor: string;
}

const COLORS = {
  background: "#1a0e15",
  gridVertical: "rgba(122, 15, 62, 0.2)",
  measureLine: "rgba(122, 15, 62, 0.5)",
  midLine: "rgba(255, 255, 255, 0.08)",
  point: "#f2efe8",
  pointHover: "#ff3fb4",
  pointSelected: "#fff7ab",
};

const POINT_RADIUS = 5;
const HOVER_RADIUS = 8;

export class AutomationLaneRenderer {
  private ctx: CanvasRenderingContext2D;
  private config: AutomationRenderConfig;
  private width: number;
  private height: number;

  constructor(
    ctx: CanvasRenderingContext2D,
    config: AutomationRenderConfig,
    width: number,
    height: number,
  ) {
    this.ctx = ctx;
    this.config = config;
    this.width = width;
    this.height = height;
  }

  updateConfig(
    config: AutomationRenderConfig,
    width: number,
    height: number,
  ): void {
    this.config = config;
    this.width = width;
    this.height = height;
  }

  render(
    points: AutomationPoint[],
    hoveredPointId: string | null = null,
    selectedPointIds: Set<string> = new Set(),
  ): void {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground();
    this.drawGrid();

    const sorted = [...points].sort((a, b) => a.x - b.x);

    if (sorted.length > 0) {
      this.drawCurve(sorted);
      this.drawFill(sorted);
    }

    this.drawPoints(sorted, hoveredPointId, selectedPointIds);
  }

  renderMarquee(
    rect: {
      startX: number;
      startY: number;
      currentX: number;
      currentY: number;
    } | null,
  ): void {
    if (!rect) return;
    const { ctx } = this;
    const x = Math.min(rect.startX, rect.currentX);
    const y = Math.min(rect.startY, rect.currentY);
    const w = Math.abs(rect.currentX - rect.startX);
    const h = Math.abs(rect.currentY - rect.startY);

    ctx.strokeStyle = "rgba(255, 63, 180, 0.8)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "rgba(255, 63, 180, 0.08)";
    ctx.fillRect(x, y, w, h);
    ctx.setLineDash([]);
  }

  private drawBackground(): void {
    this.ctx.fillStyle = COLORS.background;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawGrid(): void {
    const { ctx, config } = this;

    // Mid horizontal line
    ctx.strokeStyle = COLORS.midLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, this.height / 2);
    ctx.lineTo(this.width, this.height / 2);
    ctx.stroke();

    // Step lines
    ctx.strokeStyle = COLORS.gridVertical;
    ctx.beginPath();
    for (let col = 1; col <= config.cols; col++) {
      const x = col * config.colWidth - 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    ctx.stroke();

    // Measure lines
    ctx.strokeStyle = COLORS.measureLine;
    ctx.beginPath();
    for (let measure = 0; measure <= Math.ceil(config.cols / 4); measure++) {
      const x = measure * 4 * config.colWidth - 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    ctx.stroke();
  }

  private drawCurve(sorted: AutomationPoint[]): void {
    const { ctx, config } = this;
    if (sorted.length < 1) return;

    ctx.strokeStyle = this.config.trackColor;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const steps = this.width * 2;
    let started = false;

    for (let i = 0; i <= steps; i++) {
      const canvasX = (i / steps) * this.width;
      const col = canvasX / config.colWidth;
      const value = getAutomationValueAt(sorted, col);
      const canvasY = (1 - value) * this.height;

      if (!started) {
        ctx.moveTo(canvasX, canvasY);
        started = true;
      } else {
        ctx.lineTo(canvasX, canvasY);
      }
    }

    ctx.stroke();
  }

  private drawFill(sorted: AutomationPoint[]): void {
    const { ctx, config } = this;
    if (sorted.length < 1) return;

    const steps = this.width * 2;

    ctx.beginPath();

    for (let i = 0; i <= steps; i++) {
      const canvasX = (i / steps) * this.width;
      const col = canvasX / config.colWidth;
      const value = getAutomationValueAt(sorted, col);
      const canvasY = (1 - value) * this.height;

      if (i === 0) {
        ctx.moveTo(canvasX, canvasY);
      } else {
        ctx.lineTo(canvasX, canvasY);
      }
    }

    ctx.lineTo(this.width, this.height);
    ctx.lineTo(0, this.height);
    ctx.closePath();

    // Convert hex color to rgba with alpha
    ctx.fillStyle = this.hexToRgba(this.config.trackColor, 0.15);
    ctx.fill();
  }

  private drawPoints(
    sorted: AutomationPoint[],
    hoveredPointId: string | null,
    selectedPointIds: Set<string>,
  ): void {
    const { ctx, config } = this;

    for (const point of sorted) {
      const x = point.x * config.colWidth;
      const y = (1 - point.y) * this.height;

      const isHovered = point.id === hoveredPointId;
      const isSelected = selectedPointIds.has(point.id);
      const radius = isHovered ? HOVER_RADIUS : POINT_RADIUS;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);

      if (isSelected) {
        ctx.fillStyle = COLORS.pointSelected;
        ctx.shadowColor = "rgba(255, 247, 171, 0.5)";
        ctx.shadowBlur = 10;
      } else if (isHovered) {
        ctx.fillStyle = COLORS.pointHover;
        ctx.shadowColor = "rgba(255, 63, 180, 0.4)";
        ctx.shadowBlur = 8;
      } else {
        ctx.fillStyle = COLORS.point;
        ctx.shadowBlur = 0;
      }

      ctx.fill();
      ctx.shadowBlur = 0;

      // Outline ring
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  getPointAtPosition(
    canvasX: number,
    canvasY: number,
    points: AutomationPoint[],
  ): AutomationPoint | null {
    const { config } = this;

    for (const point of points) {
      const px = point.x * config.colWidth;
      const py = (1 - point.y) * this.height;
      const dist = Math.sqrt((canvasX - px) ** 2 + (canvasY - py) ** 2);
      if (dist <= HOVER_RADIUS) return point;
    }
    return null;
  }

  getPointsInRect(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    points: AutomationPoint[],
  ): AutomationPoint[] {
    const { config } = this;
    return points.filter((point) => {
      const px = point.x * config.colWidth;
      const py = (1 - point.y) * this.height;
      return px >= minX && px <= maxX && py >= minY && py <= maxY;
    });
  }

  canvasToPoint(
    canvasX: number,
    canvasY: number,
    scrollLeft: number,
  ): { x: number; y: number } {
    const x = (canvasX + scrollLeft) / this.config.colWidth;
    const y = Math.max(0, Math.min(1, 1 - canvasY / this.height));
    return { x, y };
  }

  private hexToRgba(hex: string, alpha: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(255,255,255,${alpha})`;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
}
