import { Injectable, signal, computed } from '@angular/core';
import { NODE_W, NODE_H } from './narrative-flow-layout.service';

export interface PendingEdge {
  sourceEventId: string;
  /** Current cursor position in scene-space coordinates. */
  cursorX: number;
  cursorY: number;
  /** Source node anchor (bottom-center of source card, scene-space). */
  anchorX: number;
  anchorY: number;
}

/**
 * Manages the rubber-band edge drawing state for Connection Mode.
 * The component owns event routing; this service holds the live state.
 */
@Injectable({ providedIn: 'root' })
export class NarrativeConnectionService {
  readonly connectionModeActive = signal(false);
  readonly pendingEdge          = signal<PendingEdge | null>(null);

  readonly rubberBandPath = computed<string | null>(() => {
    const e = this.pendingEdge();
    if (!e) return null;
    const x1 = e.anchorX;
    const y1 = e.anchorY;
    const x2 = e.cursorX;
    const y2 = e.cursorY;
    const cx = (x1 + x2) / 2;
    return `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`;
  });

  toggleConnectionMode(): void {
    this.connectionModeActive.update(v => !v);
    if (!this.connectionModeActive()) this.pendingEdge.set(null);
  }

  enableConnectionMode():  void { this.connectionModeActive.set(true); }
  disableConnectionMode(): void {
    this.connectionModeActive.set(false);
    this.pendingEdge.set(null);
  }

  startEdge(sourceEventId: string, anchorX: number, anchorY: number): void {
    this.pendingEdge.set({
      sourceEventId,
      anchorX,
      anchorY,
      cursorX: anchorX,
      cursorY: anchorY,
    });
  }

  updateCursor(sceneX: number, sceneY: number): void {
    this.pendingEdge.update(e => e ? { ...e, cursorX: sceneX, cursorY: sceneY } : null);
  }

  cancelEdge(): void { this.pendingEdge.set(null); }

  commitEdge(): { sourceEventId: string; } | null {
    const e = this.pendingEdge();
    if (!e) return null;
    this.pendingEdge.set(null);
    return { sourceEventId: e.sourceEventId };
  }
}
