import {
  Component, Input, Output, EventEmitter,
  ElementRef, ViewChild, OnChanges, OnInit, SimpleChanges, ChangeDetectionStrategy
} from '@angular/core';
import { ValueVector, primaryValue, secondaryValue, sacrificedValue, ValueLabels, DEFAULT_VALUE_LABELS } from '../../core/models/types';

export interface TernaryOverlayPoint {
  values: ValueVector;
  label: string;
  color: string;
  labelColor?: string;
}

// Equilateral triangle vertices in SVG space (origin top-left)
// Truth = top, Stability = bottom-left, Agency = bottom-right
const SIZE = 220;
const PAD  = 30;

// Vertex coordinates
const Vt: [number, number] = [PAD + SIZE / 2, PAD];                     // Truth (top)
const Vs: [number, number] = [PAD, PAD + SIZE * Math.sqrt(3) / 2];       // Stability (bottom-left)
const Va: [number, number] = [PAD + SIZE, PAD + SIZE * Math.sqrt(3) / 2]; // Agency (bottom-right)

const SVG_W = PAD * 2 + SIZE;
const SVG_H = PAD + SIZE * Math.sqrt(3) / 2 + PAD;

// Edge midpoint labels — placed 12px outside each edge midpoint, rotated parallel to edge
// Outward normals (away from opposite vertex): right=[0.866,-0.5], left=[-0.866,-0.5], bottom=[0,1]
const OFFSET = 12;
const _rMid: [number, number] = [(Vt[0]+Va[0])/2, (Vt[1]+Va[1])/2]; // Truth/Agency midpoint
const _lMid: [number, number] = [(Vt[0]+Vs[0])/2, (Vt[1]+Vs[1])/2]; // Truth/Stability midpoint
const _bMid: [number, number] = [(Vs[0]+Va[0])/2, (Vs[1]+Va[1])/2]; // Stability/Agency midpoint

const EDGE_POSITIONS: Array<{ x: number; y: number; rotate: number; labelKey: keyof ValueLabels }> = [
  { x: _rMid[0] + 0.866*OFFSET, y: _rMid[1] - 0.5*OFFSET, rotate:  60, labelKey: 'edgeAC' },
  { x: _lMid[0] - 0.866*OFFSET, y: _lMid[1] - 0.5*OFFSET, rotate: -60, labelKey: 'edgeAB' },
  { x: _bMid[0],                 y: _bMid[1] + OFFSET,      rotate:   0, labelKey: 'edgeBC' },
];

function toCartesian(v: ValueVector): [number, number] {
  const x = v.a * Vt[0] + v.b * Vs[0] + v.c * Va[0];
  const y = v.a * Vt[1] + v.b * Vs[1] + v.c * Va[1];
  return [x, y];
}

function toBarycentric(px: number, py: number): ValueVector {
  // Solve the linear system: p = a*Vt + b*Vs + c*Va, a+b+c=1
  const [x1, y1] = Vt;
  const [x2, y2] = Vs;
  const [x3, y3] = Va;

  const denom = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
  let va = ((y2 - y3) * (px - x3) + (x3 - x2) * (py - y3)) / denom;
  let vb = ((y3 - y1) * (px - x3) + (x1 - x3) * (py - y3)) / denom;
  let vc = 1 - va - vb;

  // Clamp negatives to 0 then renormalize to keep point inside triangle
  va = Math.max(0, va);
  vb = Math.max(0, vb);
  vc = Math.max(0, vc);
  const sum = va + vb + vc || 1;
  return { a: va / sum, b: vb / sum, c: vc / sum };
}

function gridLines(): Array<[number, number, number, number]> {
  const lines: Array<[number, number, number, number]> = [];
  for (const frac of [0.25, 0.5, 0.75]) {
    // Lines of constant a (parallel to Vs-Va edge)
    const p1 = toCartesian({ a: frac, b: 1 - frac, c: 0 });
    const p2 = toCartesian({ a: frac, b: 0, c: 1 - frac });
    lines.push([p1[0], p1[1], p2[0], p2[1]]);

    // Lines of constant b (parallel to Vt-Va edge)
    const p3 = toCartesian({ a: 1 - frac, b: frac, c: 0 });
    const p4 = toCartesian({ a: 0, b: frac, c: 1 - frac });
    lines.push([p3[0], p3[1], p4[0], p4[1]]);

    // Lines of constant c (parallel to Vt-Vs edge)
    const p5 = toCartesian({ a: 1 - frac, b: 0, c: frac });
    const p6 = toCartesian({ a: 0, b: 1 - frac, c: frac });
    lines.push([p5[0], p5[1], p6[0], p6[1]]);
  }
  return lines;
}

@Component({
  selector: 'app-ternary-plot',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ternary-wrap">
      <svg
        #svgEl
        [attr.width]="renderedWidth"
        [attr.height]="renderedHeight"
        [attr.viewBox]="'0 0 ' + svgW + ' ' + svgH"
        [class.editable]="editable"
        (mousedown)="onMouseDown($event)"
        (mousemove)="onMouseMove($event)"
        (mouseup)="onMouseUp()"
        (mouseleave)="onMouseUp()"
        (touchstart)="onTouchStart($event)"
        (touchmove)="onTouchMove($event)"
        (touchend)="onMouseUp()"
      >
        <!-- Triangle -->
        <polygon
          [attr.points]="trianglePoints"
          fill="var(--ternary-fill, #1e293b)"
          stroke="var(--ternary-stroke, #475569)"
          stroke-width="1.5"
        />

        <!-- Grid lines -->
        @for (line of grid; track $index) {
          <line
            [attr.x1]="line[0]" [attr.y1]="line[1]"
            [attr.x2]="line[2]" [attr.y2]="line[3]"
            stroke="var(--ternary-grid, #334155)"
            stroke-width="0.5"
          />
        }

        <!-- Vertex labels -->
        <text [attr.x]="vtx[0]" [attr.y]="vtx[1] - 8" text-anchor="middle" class="vertex-label va">{{ valueLabels.a }}</text>
        <text [attr.x]="vsx[0]" [attr.y]="vsx[1] + 16" text-anchor="middle" class="vertex-label vb">{{ valueLabels.b }}</text>
        <text [attr.x]="vax[0]" [attr.y]="vax[1] + 16" text-anchor="middle" class="vertex-label vc">{{ valueLabels.c }}</text>

        <!-- Edge midpoint labels -->
        @for (el of edgePositions; track el.labelKey) {
          <text
            [attr.x]="el.x"
            [attr.y]="el.y"
            text-anchor="middle"
            dominant-baseline="middle"
            [attr.transform]="'rotate(' + el.rotate + ',' + el.x + ',' + el.y + ')'"
            class="edge-label"
          >{{ valueLabels[el.labelKey] }}</text>
        }

        <!-- Overlay points (faction, social class, etc.) -->
        @for (ov of overlays; track ov.label) {
          @let ovPt = overlayPoint(ov.values);
          <circle
            [attr.cx]="ovPt[0]"
            [attr.cy]="ovPt[1]"
            r="5"
            [attr.fill]="ov.color"
            [attr.stroke]="ov.color"
            stroke-width="1.5"
            opacity="0.7"
          />
          @if (showOverlayLabels) {
            <text
              [attr.x]="ovPt[0]"
              [attr.y]="ovPt[1] - 9"
              text-anchor="middle"
              class="overlay-label"
              stroke="#0f172a"
              stroke-width="3"
              paint-order="stroke"
              [attr.fill]="ov.labelColor ?? ov.color"
            >{{ ov.label }}</text>
          }
        }

        <!-- Drift ghost bar: length = conviction narrows spread; marker = pressure places position -->
        @if (driftGhostBar; as gb) {
          <line
            [attr.x1]="gb.x1" [attr.y1]="gb.y1"
            [attr.x2]="gb.x2" [attr.y2]="gb.y2"
            stroke="#f97316"
            stroke-width="10"
            stroke-linecap="round"
            opacity="0.18"
          />
          @if (driftMarker; as dm) {
            <circle
              [attr.cx]="dm.x"
              [attr.cy]="dm.y"
              r="5"
              fill="#f97316"
              opacity="0.85"
            />
          }
        }

        <!-- Primary point (character / faction being edited) -->
        @if (!hidePrimaryPoint) {
          <circle
            [attr.cx]="point[0]"
            [attr.cy]="point[1]"
            r="6"
            class="value-point"
            [class.dragging]="dragging"
          />
        }
      </svg>

      <!-- Overlay legend -->
      @if (overlays.length > 0) {
        <div class="overlay-legend">
          @if (!hidePrimaryPoint) {
            <span class="legend-item primary-item">
              <span class="legend-dot primary-dot"></span>
              <span>Character</span>
            </span>
          }
          @for (item of legendItems ?? overlays; track item.label) {
            <span class="legend-item">
              <span class="legend-dot" [style.background]="item.color"></span>
              <span>{{ item.label }}</span>
            </span>
          }
        </div>
      }

      @if (showValueLabels) {
        <div class="value-labels">
          <span class="vl desires">Desires <span class="vl-value" [class]="primary.toLowerCase()">{{ valueLabel(primary) }}</span></span>
          <span class="vl maintains">Maintains <span class="vl-value" [class]="secondary.toLowerCase()">{{ valueLabel(secondary) }}</span></span>
          <span class="vl sacrifices">Sacrifices <span class="vl-value" [class]="sacrificed.toLowerCase()">{{ valueLabel(sacrificed) }}</span></span>
        </div>
      }
    </div>
  `,
  styles: [`
    .ternary-wrap { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }

    svg { user-select: none; }
    svg.editable { cursor: crosshair; }

    .vertex-label {
      font-size: 11px;
      font-weight: 600;
      fill: var(--color-text-muted, #94a3b8);
    }
    .vertex-label.va { fill: var(--color-valuea, #f59e0b); }
    .vertex-label.vb { fill: var(--color-valueb, #14b8a6); }
    .vertex-label.vc { fill: var(--color-valuec, #8b5cf6); }

    .edge-label {
      font-size: 9px;
      font-weight: 500;
      fill: #475569;
      pointer-events: none;
    }

    .overlay-label {
      font-size: 7px;
      font-weight: 600;
      pointer-events: none;
    }

    .value-point {
      fill: #f8fafc;
      stroke: #94a3b8;
      stroke-width: 2;
      transition: r 0.1s;
    }
    .value-point.dragging { r: 8; fill: #94a3b8; }

    .value-labels {
      display: flex;
      gap: 0.75rem;
      font-size: 0.75rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    .vl { padding: 2px 8px; border-radius: 4px; font-weight: 500; }
    .vl { background: var(--bg-base, #0f172a); color: var(--text-muted, #64748b); }

    .vl-value {
      font-weight: 700;
      &.a { color: var(--color-valuea, #f59e0b); }
      &.b { color: var(--color-valueb, #14b8a6); }
      &.c { color: var(--color-valuec, #8b5cf6); }
    }

    .overlay-legend {
      display: flex;
      gap: 0.75rem;
      font-size: 0.72rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      color: var(--color-text-muted, #94a3b8);
    }
    .legend-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .primary-dot { background: #f8fafc; border: 1.5px solid #94a3b8; }
  `]
})
export class TernaryPlotComponent implements OnInit, OnChanges {
  @Input() values: ValueVector = { a: 1/3, b: 1/3, c: 1/3 };
  @Input() editable = false;
  @Input() size = SVG_W;           // rendered pixel width; height scales proportionally
  @Input() showValueLabels = true; // show Desires/Maintains/Sacrifices pills below SVG
  /** Additional read-only overlay points (e.g. faction position, social class position). */
  @Input() overlays: TernaryOverlayPoint[] = [];
  @Input() legendItems: { label: string; color: string }[] | null = null;
  @Input() showOverlayLabels = false;
  @Input() hidePrimaryPoint = false;
  /**
   * When set, draws a ghost bar from the character's current position toward this target.
   * Bar length is governed by conviction (spread); a marker within the bar is placed by pressure.
   */
  @Input() driftTarget: ValueVector | null = null;
  /** Character's conviction (0–100). Higher conviction narrows the ghost bar. */
  @Input() conviction = 50;
  /** Effective pressure (0–100+). Higher pressure moves the marker further along the bar. */
  @Input() pressure = 0;
  @Output() valuesChange = new EventEmitter<ValueVector>();

  @ViewChild('svgEl') svgEl!: ElementRef<SVGSVGElement>;

  @Input() valueLabels: ValueLabels = DEFAULT_VALUE_LABELS;

  readonly svgW = SVG_W;
  readonly svgH = SVG_H;
  readonly trianglePoints = `${Vt[0]},${Vt[1]} ${Vs[0]},${Vs[1]} ${Va[0]},${Va[1]}`;
  readonly grid = gridLines();
  readonly vtx = Vt;
  readonly vsx = Vs;
  readonly vax = Va;
  readonly edgePositions = EDGE_POSITIONS;

  get renderedWidth(): number  { return this.size; }
  get renderedHeight(): number { return Math.round(this.size * SVG_H / SVG_W); }

  point: [number, number] = toCartesian(this.values);
  dragging = false;

  primary    = primaryValue(this.values);
  secondary  = secondaryValue(this.values);
  sacrificed = sacrificedValue(this.values);

  // Stored fields — recomputed in ngOnChanges to avoid OnPush getter staleness
  driftGhostBar: { x1: number; y1: number; x2: number; y2: number } | null = null;
  driftMarker: { x: number; y: number } | null = null;

  valueLabel(coreValue: string): string {
    const k = coreValue.toLowerCase() as 'a' | 'b' | 'c';
    return (k === 'a' || k === 'b' || k === 'c') ? this.valueLabels[k] : coreValue;
  }

  overlayPoint(v: ValueVector): [number, number] {
    return toCartesian(v);
  }

  private recomputeDriftGhostBar(): void {
    if (!this.driftTarget) {
      this.driftGhostBar = null;
      this.driftMarker = null;
      return;
    }
    // Conviction narrows the spread: 0 conviction = full range, 100 conviction = no bar
    const spread = 1 - Math.min(100, Math.max(0, this.conviction)) / 100;
    if (spread <= 0) {
      this.driftGhostBar = null;
      this.driftMarker = null;
      return;
    }
    const [x1, y1] = this.point;
    const [tx, ty] = toCartesian(this.driftTarget);
    const x2 = x1 + (tx - x1) * spread;
    const y2 = y1 + (ty - y1) * spread;
    this.driftGhostBar = { x1, y1, x2, y2 };

    // Pressure places the marker along the bar as a percentage
    const pFrac = Math.min(100, Math.max(0, this.pressure)) / 100;
    const mx = x1 + (x2 - x1) * pFrac;
    const my = y1 + (y2 - y1) * pFrac;
    this.driftMarker = { x: mx, y: my };
  }

  ngOnInit(): void {
    this.recomputeDriftGhostBar();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['values']) {
      this.point     = toCartesian(this.values);
      this.primary   = primaryValue(this.values);
      this.secondary = secondaryValue(this.values);
      this.sacrificed = sacrificedValue(this.values);
    }
    if (changes['values'] || changes['driftTarget'] || changes['conviction'] || changes['pressure']) {
      this.recomputeDriftGhostBar();
    }
  }

  onMouseDown(e: MouseEvent): void {
    if (!this.editable) return;
    this.dragging = true;
    this.updateFromEvent(e.clientX, e.clientY);
  }

  onMouseMove(e: MouseEvent): void {
    if (!this.dragging) return;
    this.updateFromEvent(e.clientX, e.clientY);
  }

  onMouseUp(): void {
    this.dragging = false;
  }

  onTouchStart(e: TouchEvent): void {
    if (!this.editable) return;
    e.preventDefault();
    this.dragging = true;
    const t = e.touches[0];
    this.updateFromEvent(t.clientX, t.clientY);
  }

  onTouchMove(e: TouchEvent): void {
    if (!this.dragging) return;
    e.preventDefault();
    const t = e.touches[0];
    this.updateFromEvent(t.clientX, t.clientY);
  }

  private updateFromEvent(clientX: number, clientY: number): void {
    const rect = this.svgEl.nativeElement.getBoundingClientRect();
    const scaleX = SVG_W / rect.width;
    const scaleY = SVG_H / rect.height;
    const px = (clientX - rect.left) * scaleX;
    const py = (clientY - rect.top)  * scaleY;

    const newValues = toBarycentric(px, py);
    this.point      = toCartesian(newValues);
    this.primary    = primaryValue(newValues);
    this.secondary  = secondaryValue(newValues);
    this.sacrificed = sacrificedValue(newValues);
    this.recomputeDriftGhostBar();
    this.valuesChange.emit(newValues);
  }
}
