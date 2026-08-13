import {
  Component, inject, computed, signal, ViewChild, ElementRef,
  AfterViewInit, OnDestroy, ChangeDetectionStrategy, NgZone, effect,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3-selection';
import * as d3zoom from 'd3-zoom';
import * as d3drag from 'd3-drag';
import { AppStore } from '../../store/app.store';
import {
  NarrativeEvent, NarrativeEventPlacement,
} from '../../core/models/types';
import { PathContextService } from './services/path-context.service';
import { NarrativeFlowLayoutService, NODE_W, NODE_H, NodePos } from './services/narrative-flow-layout.service';
import { NarrativeConnectionService } from './services/narrative-connection.service';
import { NarrativeFocusService } from './services/narrative-focus.service';
import { NarrativeFilterService } from './services/narrative-filter.service';
import { NarrativeFlowCrownComponent } from './narrative-flow-crown.component';
import { NarrativeFlowBreadcrumbComponent } from './narrative-flow-breadcrumb.component';
import { NarrativeFlowToolbarComponent } from './narrative-flow-toolbar.component';
import { NarrativeFocusOverlayComponent } from './narrative-focus-overlay.component';
import { NarrativeEventEditorComponent } from './narrative-event-editor.component';
import { NarrativeFilterPanelComponent } from './narrative-filter-panel.component';

// ─── Undo/redo history ────────────────────────────────────────────────────────

type HistoryEntry =
  | { type: 'move';  eventId: string;   before: NodePos; after: NodePos }
  | { type: 'addConn';    connId: string; sourceId: string; targetId: string }
  | { type: 'removeConn'; connId: string; sourceId: string; targetId: string };

// ─── View constants ───────────────────────────────────────────────────────────

const SNAP_GRID     = 20;
const CROWN_PEEK    = 50; // how many px of crown card stick up above the node top

@Component({
  selector: 'app-narrative-flow',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    NarrativeFlowCrownComponent,
    NarrativeFlowBreadcrumbComponent,
    NarrativeFlowToolbarComponent,
    NarrativeFocusOverlayComponent,
    NarrativeEventEditorComponent,
    NarrativeFilterPanelComponent,
  ],
  templateUrl: './narrative-flow.component.html',
  styleUrl: './narrative-flow.component.scss',
})
export class NarrativeFlowComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasWrap') canvasWrap!: ElementRef<HTMLDivElement>;
  @ViewChild('scene')      scene!:      ElementRef<HTMLDivElement>;
  @ViewChild('edgeSvg')    edgeSvg!:    ElementRef<SVGSVGElement>;

  readonly store      = inject(AppStore);
  private  zone       = inject(NgZone);
  readonly pathCtx    = inject(PathContextService);
  private  layout     = inject(NarrativeFlowLayoutService);
  readonly connSvc    = inject(NarrativeConnectionService);
  readonly focusSvc   = inject(NarrativeFocusService);
  readonly filterSvc  = inject(NarrativeFilterService);

  // ── View state ────────────────────────────────────────────────────────────

  // Live node positions during this session (eventId → {x,y}).
  private livePos = new Map<string, NodePos>();

  // Trigger for redraw
  private redrawTick = signal(0);

  // ── Erase mode ────────────────────────────────────────────────────────────

  showFilterPanel = signal(false);
  eraseModeActive = signal(false);
  toggleEraseMode(): void {
    this.eraseModeActive.update(v => !v);
    if (this.eraseModeActive()) this.connSvc.disableConnectionMode();
  }

  // ── Snap to grid ──────────────────────────────────────────────────────────

  snapActive = signal(false);
  toggleSnap(): void { this.snapActive.update(v => !v); }

  private snap(v: number): number {
    return this.snapActive() ? Math.round(v / SNAP_GRID) * SNAP_GRID : v;
  }

  // ── Undo / Redo ───────────────────────────────────────────────────────────

  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];

  readonly canUndo = computed(() => this.redrawTick() >= 0 && this.undoStack.length > 0);
  readonly canRedo = computed(() => this.redrawTick() >= 0 && this.redoStack.length > 0);

  private pushHistory(entry: HistoryEntry): void {
    this.undoStack.push(entry);
    this.redoStack = [];
  }

  undo(): void {
    const entry = this.undoStack.pop();
    if (!entry) return;
    this.redoStack.push(entry);
    this.applyHistory(entry, 'undo');
  }

  redo(): void {
    const entry = this.redoStack.pop();
    if (!entry) return;
    this.undoStack.push(entry);
    this.applyHistory(entry, 'redo');
  }

  private applyHistory(entry: HistoryEntry, direction: 'undo' | 'redo'): void {
    if (entry.type === 'move') {
      const pos = direction === 'undo' ? entry.before : entry.after;
      this.livePos.set(entry.eventId, pos);
      this.locallyPositioned.add(entry.eventId);
      this.store.savePlacements([{ narrativeEventId: entry.eventId, x: pos.x, y: pos.y }]);
      this.zone.run(() => this.redrawTick.update(n => n + 1));
    } else if (entry.type === 'addConn' && direction === 'undo') {
      this.store.deleteConnection(entry.connId);
    } else if (entry.type === 'removeConn' && direction === 'undo') {
      this.createConnection(entry.sourceId, entry.targetId);
    } else if (entry.type === 'addConn' && direction === 'redo') {
      this.createConnection(entry.sourceId, entry.targetId);
    } else if (entry.type === 'removeConn' && direction === 'redo') {
      this.store.deleteConnection(entry.connId);
    }
  }

  // ── Search ────────────────────────────────────────────────────────────────

  searchHighlightId = signal<string | null>(null);

  onSearchChange(query: string): void {
    if (!query.trim()) { this.searchHighlightId.set(null); return; }
    const q   = query.toLowerCase();
    const match = this.store.narrativeEvents().find(e =>
      e.title.toLowerCase().includes(q) ||
      (e.summary ?? '').toLowerCase().includes(q)
    );
    if (match) {
      this.searchHighlightId.set(match.id);
      this.centerOnEvent(match.id);
    }
  }

  private centerOnEvent(eventId: string): void {
    const pos = this.livePos.get(eventId);
    if (!pos || !this.canvasWrap) return;
    const wrap = this.canvasWrap.nativeElement;
    const tx   = wrap.clientWidth  / 2 - (pos.x + NODE_W / 2) * this.currentTransform.k;
    const ty   = wrap.clientHeight / 2 - (pos.y + NODE_H / 2) * this.currentTransform.k;
    d3.select(wrap).call(
      (this.zoom as any).transform,
      d3zoom.zoomIdentity.translate(tx, ty).scale(this.currentTransform.k)
    );
  }

  // ── Debounced placement save ───────────────────────────────────────────────

  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingMoves = new Map<string, NodePos>();

  // ── d3 zoom state ─────────────────────────────────────────────────────────

  private zoom!: d3zoom.ZoomBehavior<HTMLDivElement, unknown>;
  private currentTransform: d3zoom.ZoomTransform = d3zoom.zoomIdentity;
  private transformSig = signal<d3zoom.ZoomTransform>(d3zoom.zoomIdentity);

  // ── Condense mode ─────────────────────────────────────────────────────────

  readonly isCondenseMode = computed(() =>
    this.filterSvc.viewMode() === 'condense' && this.filterSvc.isActive()
  );

  // Temporary layout used only when condense mode is active.
  private readonly condensedLayout = computed<Map<string, NodePos> | null>(() => {
    if (!this.isCondenseMode()) return null;
    return this.layout.computeCondensed(
      this.filterSvc.matchedEventIds(),
      this.store.narrativeConnections(),
    );
  });

  // ── Derived ────────────────────────────────────────────────────────────────

  // ── Edge overflow indicators ───────────────────────────────────────────────

  overflow = computed(() => {
    const t      = this.transformSig();
    const events = this.store.narrativeEvents();
    const wrap   = this.canvasWrap?.nativeElement;
    if (!wrap || events.length === 0) return { top: false, right: false, bottom: false, left: false };

    const W = wrap.clientWidth;
    const H = wrap.clientHeight;

    let top = false, right = false, bottom = false, left = false;

    for (const ev of events) {
      const p = this.livePos.get(ev.id);
      if (!p) continue;
      const x1 = p.x * t.k + t.x;
      const y1 = p.y * t.k + t.y;
      const x2 = (p.x + NODE_W) * t.k + t.x;
      const y2 = (p.y + NODE_H) * t.k + t.y;

      if (y1 < 0)  top    = true;
      if (x2 > W)  right  = true;
      if (y2 > H)  bottom = true;
      if (x1 < 0)  left   = true;
    }

    return { top, right, bottom, left };
  });

  // ── Context menu ──────────────────────────────────────────────────────────

  contextMenu = signal<{ x: number; y: number; eventId: string } | null>(null);

  openContextMenu(event: MouseEvent, eventId: string): void {
    event.preventDefault();
    event.stopPropagation();
    const canvasRect = this.canvasWrap.nativeElement.getBoundingClientRect();
    const btnRect    = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.contextMenu.set({
      x: btnRect.left - canvasRect.left,
      y: btnRect.bottom - canvasRect.top + 4,
      eventId,
    });
  }

  closeContextMenu(): void { this.contextMenu.set(null); }

  // ── Node hover state (for connect handle) ─────────────────────────────────

  hoveredEventId = signal<string | null>(null);

  // ── Crown positions (in world space, above each origin event) ────────────

  crownPositions = computed(() => {
    this.redrawTick();
    this.condensedLayout(); // invalidate when condense layout changes
    const condense        = this.isCondenseMode();
    const condensed       = this.condensedLayout();
    const focusOpacityFn  = this.focusSvc.opacityFn();
    const filterOpacityFn = this.filterSvc.opacityFn();

    return this.store.pathSets()
      .filter(ps => !!ps.originEventId)
      .filter(ps => !condense || condensed?.has(ps.originEventId!))
      .map(ps => {
        const pos     = this.posFor(ps.originEventId!);
        const opacity = condense
          ? 1
          : Math.min(focusOpacityFn(ps.originEventId!), filterOpacityFn(ps.originEventId!));
        return {
          originEventId: ps.originEventId!,
          x: pos.x,
          y: pos.y - CROWN_PEEK,
          opacity,
        };
      });
  });

  // ── Node view models ───────────────────────────────────────────────────────

  nodeGroups = computed(() => {
    this.redrawTick();
    this.condensedLayout(); // invalidate when condense layout changes

    const activePathIds   = this.pathCtx.activePathIds();
    const effectiveFn     = this.store.effectiveEvent();
    const focusOpacityFn  = this.focusSvc.opacityFn();
    const filterOpacityFn = this.filterSvc.opacityFn();
    const searchId        = this.searchHighlightId();
    const varParts        = this.store.variantParticipations();
    const condense        = this.isCondenseMode();
    const condensed       = this.condensedLayout();

    return this.store.narrativeEvents()
      .filter(baseEvent => !condense || condensed?.has(baseEvent.id))
      .map(baseEvent => {
        const basePos      = this.posFor(baseEvent.id);
        const opacity      = condense
          ? 1
          : Math.min(focusOpacityFn(baseEvent.id), filterOpacityFn(baseEvent.id));
        const ev           = effectiveFn(baseEvent, activePathIds);
        const variantCount = varParts.filter(vp => vp.narrativeEventId === baseEvent.id).length;
        const stackDepth   = Math.min(variantCount, 3);

        return {
          canonicalId: baseEvent.id,
          ev,
          x: basePos.x,
          y: basePos.y,
          opacity,
          stackDepth,
          searchHighlight: baseEvent.id === searchId,
        };
      });
  });

  // ── Thread count / Actor count / Asset count for node display ─────────────

  eventThreadCount = computed(() => {
    const activePathIds     = this.pathCtx.activePathIds();
    const effectiveThreadsFn = this.store.effectiveThreadIdsForEvent();
    return (eventId: string) => effectiveThreadsFn(eventId, activePathIds).length;
  });
  eventActorCount = computed(() => {
    const activePathIds    = this.pathCtx.activePathIds();
    const effectiveLinksFn = this.store.effectiveEntityLinksForEvent();
    return (eventId: string) =>
      effectiveLinksFn(eventId, activePathIds).filter(l => l.entityType === 'Character').length;
  });
  eventAssetCount = computed(() => {
    const activePathIds    = this.pathCtx.activePathIds();
    const effectiveLinksFn = this.store.effectiveEntityLinksForEvent();
    return (eventId: string) =>
      effectiveLinksFn(eventId, activePathIds).filter(l => l.entityType === 'Asset').length;
  });

  // ── Edge view models ───────────────────────────────────────────────────────

  edgePaths = computed(() => {
    this.redrawTick();
    this.condensedLayout(); // invalidate when condense layout changes

    const condense  = this.isCondenseMode();
    const condensed = this.condensedLayout();
    const conns     = this.store.effectiveConnectionsForGraph()(this.pathCtx.activePathIds());

    return conns
      .filter(c => !condense || (condensed?.has(c.sourceNarrativeEventId) && condensed?.has(c.targetNarrativeEventId)))
      .map(c => {
        const srcPos = this.posFor(c.sourceNarrativeEventId);
        const tgtPos = this.posFor(c.targetNarrativeEventId);

        const x1 = srcPos.x + NODE_W;
        const y1 = srcPos.y + NODE_H / 2;
        const x2 = tgtPos.x;
        const y2 = tgtPos.y + NODE_H / 2;
        const cx = (x1 + x2) / 2;

        return { id: c.id, d: `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}` };
      });
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  private posFor(eventId: string): NodePos {
    return this.condensedLayout()?.get(eventId) ?? this.livePos.get(eventId) ?? { x: 0, y: 0 };
  }

  constructor() {
    effect(() => {
      const events     = this.store.narrativeEvents();
      const placements = this.store.narrativePlacements();
      this.zone.runOutsideAngular(() => this.syncPositions(events, placements));
    });

    // Fit the condensed layout into view whenever condense mode activates.
    effect(() => {
      const layout = this.condensedLayout();
      if (!layout || !this.canvasWrap) return;
      const matchedEvents = this.store.narrativeEvents()
        .filter(e => layout.has(e.id));
      const wrap = this.canvasWrap.nativeElement;
      const fit  = this.layout.fitViewTransform(
        layout, matchedEvents, wrap.clientWidth || 800, wrap.clientHeight || 600,
      );
      if (!fit) return;
      d3.select(wrap).call(
        (this.zoom as any).transform,
        d3zoom.zoomIdentity.translate(fit.tx, fit.ty).scale(fit.scale),
      );
    });
  }

  ngAfterViewInit(): void {
    this.initZoom();
  }

  ngOnDestroy(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.flushSave();
  }

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const meta = event.metaKey || event.ctrlKey;

    if (event.key === 'Escape') {
      if (this.connSvc.pendingEdge()) { this.connSvc.cancelEdge(); return; }
      if (this.connSvc.connectionModeActive()) { this.connSvc.disableConnectionMode(); return; }
      if (this.eraseModeActive()) { this.eraseModeActive.set(false); return; }
      return;
    }

    if (meta && !event.shiftKey && event.key === 'z') { event.preventDefault(); this.undo(); return; }
    if (meta && event.shiftKey  && event.key === 'z') { event.preventDefault(); this.redo(); return; }
    if (meta && event.key === 'y')                     { event.preventDefault(); this.redo(); return; }
  }

  // ── Position sync ──────────────────────────────────────────────────────────

  private locallyPositioned = new Set<string>();

  private syncPositions(events: NarrativeEvent[], placements: NarrativeEventPlacement[]): void {
    const placementMap = new Map(placements.map(p => [p.narrativeEventId, p]));
    const needsDagre   = events.filter(e => !placementMap.has(e.id));
    const dagrePos     = needsDagre.length
      ? this.layout.computeDagre(needsDagre, this.store.narrativeConnections())
      : new Map<string, NodePos>();

    let changed = false;
    for (const ev of events) {
      const saved  = placementMap.get(ev.id);
      const dagPos = dagrePos.get(ev.id);

      if (saved && !this.locallyPositioned.has(ev.id)) {
        const cur = this.livePos.get(ev.id);
        if (!cur || cur.x !== saved.x || cur.y !== saved.y) {
          this.livePos.set(ev.id, { x: saved.x, y: saved.y });
          changed = true;
        }
      } else if (!saved && !this.livePos.has(ev.id)) {
        const raw = dagPos ?? { x: 0, y: 0 };
        const pos = this.layout.findClearPosition(raw, this.livePos.values());
        this.livePos.set(ev.id, pos);
        this.locallyPositioned.add(ev.id);
        changed = true;
      }
    }
    for (const id of this.livePos.keys()) {
      if (!events.find(e => e.id === id)) { this.livePos.delete(id); changed = true; }
    }

    if (changed) this.zone.run(() => this.redrawTick.update(n => n + 1));
  }

  // ── d3 zoom ────────────────────────────────────────────────────────────────

  private initZoom(): void {
    const wrap    = this.canvasWrap.nativeElement;
    const scene   = this.scene.nativeElement;
    const edgeSvg = this.edgeSvg.nativeElement;

    this.zoom = d3zoom.zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.15, 3])
      .on('zoom', (event: d3zoom.D3ZoomEvent<HTMLDivElement, unknown>) => {
        this.currentTransform = event.transform;
        const t = event.transform;
        scene.style.transform   = `translate(${t.x}px,${t.y}px) scale(${t.k})`;
        edgeSvg.style.transform = `translate(${t.x}px,${t.y}px) scale(${t.k})`;
        this.zone.run(() => this.transformSig.set(event.transform));
      });

    d3.select(wrap).call(this.zoom as any);
    this.fitView();
  }

  fitView(): void {
    const events = this.store.narrativeEvents();
    if (events.length === 0) return;

    const wrap = this.canvasWrap.nativeElement;
    const fit  = this.layout.fitViewTransform(
      this.livePos, events, wrap.clientWidth || 800, wrap.clientHeight || 600
    );
    if (!fit) return;

    d3.select(this.canvasWrap.nativeElement)
      .call((this.zoom as any).transform,
        d3zoom.zoomIdentity.translate(fit.tx, fit.ty).scale(fit.scale));
  }

  // ── Node drag ──────────────────────────────────────────────────────────────

  private dragInitialized = new WeakSet<HTMLElement>();

  initNodeDrag(el: HTMLElement, canonicalId: string): void {
    if (this.isCondenseMode()) return;
    if (this.dragInitialized.has(el)) return;
    this.dragInitialized.add(el);

    let startX = 0, startY = 0, origX = 0, origY = 0;
    let dragBefore: NodePos | null = null;

    const dragBehavior = d3drag.drag<HTMLElement, unknown>()
      .on('start', (event: d3drag.D3DragEvent<HTMLElement, unknown, unknown>) => {
        event.sourceEvent.stopPropagation();
        const pos = this.livePos.get(canonicalId) ?? { x: 0, y: 0 };
        startX = event.x; startY = event.y;
        origX  = pos.x;   origY  = pos.y;
        dragBefore = { ...pos };
      })
      .on('drag', (event: d3drag.D3DragEvent<HTMLElement, unknown, unknown>) => {
        const k    = this.currentTransform.k;
        const newX = this.snap(origX + (event.x - startX) / k);
        const newY = this.snap(origY + (event.y - startY) / k);
        this.livePos.set(canonicalId, { x: newX, y: newY });
        this.locallyPositioned.add(canonicalId);
        this.redrawTick.update(n => n + 1);
        this.queueSave(canonicalId, { x: newX, y: newY });
      })
      .on('end', () => {
        if (dragBefore) {
          const after = this.livePos.get(canonicalId)!;
          if (after.x !== dragBefore.x || after.y !== dragBefore.y) {
            this.pushHistory({ type: 'move', eventId: canonicalId, before: dragBefore, after: { ...after } });
          }
          dragBefore = null;
        }
      });

    d3.select(el).call(dragBehavior as any);
  }

  private queueSave(id: string, pos: NodePos): void {
    this.pendingMoves.set(id, pos);
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flushSave(), 800);
  }

  private flushSave(): void {
    if (this.pendingMoves.size === 0) return;
    const toSave: NarrativeEventPlacement[] = Array.from(this.pendingMoves.entries())
      .map(([id, pt]) => ({ narrativeEventId: id, x: pt.x, y: pt.y }));
    this.pendingMoves.clear();
    this.store.savePlacements(toSave);
  }

  // ── Connect handle (right-edge hover) ────────────────────────────────────

  startConnectFromNode(event: MouseEvent, canonicalId: string): void {
    event.stopPropagation();
    if (this.eraseModeActive()) return;
    this.connSvc.disableConnectionMode();
    const pos = this.livePos.get(canonicalId) ?? { x: 0, y: 0 };
    // Start from the right-middle edge of the node
    this.connSvc.startEdge(canonicalId, pos.x + NODE_W, pos.y + NODE_H / 2);
  }

  // ── Canvas interaction (connection + erase) ────────────────────────────────

  onNodePointerDown(event: MouseEvent, canonicalId: string): void {
    if (this.connSvc.connectionModeActive() || this.connSvc.pendingEdge()) {
      event.stopPropagation();
      const pos = this.livePos.get(canonicalId) ?? { x: 0, y: 0 };
      if (!this.connSvc.pendingEdge()) {
        this.connSvc.startEdge(canonicalId, pos.x + NODE_W / 2, pos.y + NODE_H / 2);
      }
    }
  }

  onNodePointerUp(event: MouseEvent, canonicalId: string): void {
    if (this.connSvc.pendingEdge()) {
      event.stopPropagation();
      const pending = this.connSvc.commitEdge();
      if (pending && pending.sourceEventId !== canonicalId) {
        this.createConnection(pending.sourceEventId, canonicalId);
      }
    }
  }

  onCanvasMouseMove(event: MouseEvent): void {
    if (!this.connSvc.pendingEdge()) return;
    const rect = this.canvasWrap.nativeElement.getBoundingClientRect();
    const t    = this.currentTransform;
    const sceneX = (event.clientX - rect.left - t.x) / t.k;
    const sceneY = (event.clientY - rect.top  - t.y) / t.k;
    this.connSvc.updateCursor(sceneX, sceneY);
  }

  onCanvasPointerUp(): void {
    if (this.connSvc.pendingEdge()) this.connSvc.cancelEdge();
  }

  onEdgeClick(event: MouseEvent, connectionId: string): void {
    event.stopPropagation();
    if (!this.eraseModeActive()) return;
    const conn = this.store.narrativeConnections().find(c => c.id === connectionId);
    if (conn) {
      this.pushHistory({ type: 'removeConn', connId: connectionId, sourceId: conn.sourceNarrativeEventId, targetId: conn.targetNarrativeEventId });
    }
    this.store.deleteConnection(connectionId);
  }

  async setPathSetOrigin(pathSetId: string, eventId: string): Promise<void> {
    const ps = this.store.pathSets().find(s => s.id === pathSetId);
    if (!ps) return;
    const newOrigin = ps.originEventId === eventId ? undefined : eventId;
    await this.store.savePathSet({ ...ps, originEventId: newOrigin });
    this.closeContextMenu();
  }

  pathSetsForEvent(eventId: string): { id: string; name: string; isOrigin: boolean }[] {
    return this.store.pathSets().map(ps => ({
      id: ps.id,
      name: ps.name,
      isOrigin: ps.originEventId === eventId,
    }));
  }

  private async createConnection(sourceId: string, targetId: string): Promise<void> {
    const campaignId = this.store.narrativeEvents()[0]?.campaignId ?? '';
    const saved = await this.store.saveConnection({
      id: '', campaignId,
      sourceNarrativeEventId: sourceId,
      targetNarrativeEventId: targetId,
      visibility: 'GMOnly',
    });
    if (saved) {
      this.pushHistory({ type: 'addConn', connId: saved.id, sourceId, targetId });
    }
  }

  // ── Public helpers ─────────────────────────────────────────────────────────

  stackPeeks(depth: number): number[] {
    return Array.from({ length: depth }, (_, i) => i);
  }

  statusColor(status: string): string {
    switch (status) {
      case 'Available':  return '#22c55e';
      case 'Occurred':   return '#6366f1';
      case 'Bypassed':   return '#f59e0b';
      case 'Obsolete':   return '#6b7280';
      default:           return 'var(--border)'; // Planned
    }
  }

  // ── Event editor ───────────────────────────────────────────────────────────

  /** The event currently open in the editor modal, or null when closed. */
  editingEvent = signal<NarrativeEvent | null>(null);

  openAddEvent(): void {
    const campaignId = this.store.narrativeEvents()[0]?.campaignId
      ?? this.store.pathSets()[0]?.campaignId ?? '';
    const newEvent: NarrativeEvent = {
      id: '', campaignId,
      title: '', summary: undefined, description: undefined,
      narrativeFunction: undefined,
      status: 'Planned', visibility: 'GMOnly', sortOrder: 0,
    };
    // Save a shell event first so the editor has a real ID to attach data to.
    // We open it immediately after creation.
    this.store.saveNarrativeEvent(newEvent).then(saved => {
      this.editingEvent.set(saved);
    });
  }

  openEventEditor(event: NarrativeEvent): void {
    if (this.pathCtx.editingLocked()) return;
    this.editingEvent.set(event);
  }

  closeEventEditor(): void {
    this.editingEvent.set(null);
  }

}
