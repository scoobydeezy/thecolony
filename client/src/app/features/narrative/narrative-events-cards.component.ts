import {
  Component, input, output, signal, computed, inject, OnDestroy, ElementRef, viewChild
} from '@angular/core';
import { AppStore } from '../../store/app.store';
import { NarrativeEventCardComponent } from './narrative-event-card.component';
import { NarrativeEvent, NarrativeEventStatus, NarrativePath } from '../../core/models/types';
import { PathContextService } from './services/path-context.service';

export interface SequenceItem {
  kind: 'card';
  event: NarrativeEvent;
  /** The path currently selected at the branch this card belongs to (null = shared) */
  activeBranchPathId: string | null;
}

export interface PathRow {
  pathSetId: string;
  pathSetName: string;
  originEventId: string;
  paths: NarrativePath[];
  originCardIndex: number;
  convergenceCardIndex: number | null;
}

export type TrackItem = SequenceItem;

const CARD_W    = 400;
const TRACK_GAP = 21;   // 1.5rem
const TRACK_PAD = 7;    // 0.5rem padding-left on .track
const DOT_SIZE  = 24;

type DragMode = null | { mode: 'moving'; eventId: string } | { mode: 'adding' };

@Component({
  selector: 'app-narrative-events-cards',
  standalone: true,
  imports: [NarrativeEventCardComponent],
  templateUrl: './narrative-events-cards.component.html',
  styleUrl: './narrative-events-cards.component.scss',
})
export class NarrativeEventsCardsComponent implements OnDestroy {
  store    = inject(AppStore);
  pathCtx  = inject(PathContextService);

  // ── Inputs from shell ─────────────────────────────────────────────────────

  search       = input<string>('');
  filterStatus = input<NarrativeEventStatus | 'all'>('all');
  filterThread = input<string>('all');

  // ── Outputs to shell ──────────────────────────────────────────────────────

  addEventAt = output<number>();
  editEvent  = output<NarrativeEvent>();

  // ── Track container ───────────────────────────────────────────────────────

  trackEl = viewChild<ElementRef<HTMLElement>>('track');

  // ── Base sorted event list ────────────────────────────────────────────────

  private sortedEvents = computed(() =>
    this.store.narrativeEvents()
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
  );

  // ── Shared helpers ─────────────────────────────────────────────────────────

  private get branchMap(): Map<string, NarrativePath[]> {
    const pathSets       = this.store.pathSets();
    const narrativePaths = this.store.narrativePaths();
    const map = new Map<string, NarrativePath[]>();
    for (const ps of pathSets) {
      if (!ps.originEventId) continue;
      const paths = narrativePaths
        .filter(p => p.pathSetId === ps.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      if (!map.has(ps.originEventId)) map.set(ps.originEventId, []);
      map.get(ps.originEventId)!.push(...paths);
    }
    return map;
  }

  // ── Build the linear track sequence (cards only) ─────────────────────────

  readonly trackItems = computed((): TrackItem[] => {
    const q  = this.search().toLowerCase();
    const st = this.filterStatus();
    const th = this.filterThread();

    const branchMap     = this.branchMap;
    const activePathIds = this.pathCtx.activePathIds();

    const items: TrackItem[] = [];

    for (const ev of this.sortedEvents()) {
      if (q && !ev.title.toLowerCase().includes(q)) continue;
      if (st !== 'all' && ev.status !== st) continue;
      if (th !== 'all') {
        const ids = this.store.narrativeConnections()
          .filter(c => c.sourceNarrativeEventId === ev.id || c.targetNarrativeEventId === ev.id)
          .map(c => c.threadId);
        if (!ids.includes(th)) continue;
      }

      // Determine the active branch path for this event, if any.
      // An event is "on a branch" if it is between a PathSet origin and convergence.
      // Scope is now derived, not stored, so we just pass the active path for
      // content resolution; all events in sortOrder range are always shown.
      let activeBranchPathId: string | null = null;
      for (const [, paths] of branchMap.entries()) {
        const activeInBranch = paths.find(p => activePathIds.has(p.id));
        if (activeInBranch) { activeBranchPathId = activeInBranch.id; break; }
      }

      items.push({ kind: 'card', event: ev, activeBranchPathId });
    }

    return items;
  });

  // ── Path rows (one per PathSet with an originEvent) ───────────────────────
  // Each row describes the horizontal band to render above the track.

  readonly pathRows = computed((): PathRow[] => {
    const pathSets       = this.store.pathSets();
    const narrativePaths = this.store.narrativePaths();
    const cards          = this.trackItems();

    return pathSets
      .filter(ps => !!ps.originEventId)
      .map(ps => {
        const originIdx      = cards.findIndex(c => c.event.id === ps.originEventId);
        const convergenceIdx = ps.convergenceEventId
          ? cards.findIndex(c => c.event.id === ps.convergenceEventId)
          : null;
        const paths = narrativePaths
          .filter(p => p.pathSetId === ps.id)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        return {
          pathSetId:            ps.id,
          pathSetName:          ps.name,
          originEventId:        ps.originEventId!,
          paths,
          originCardIndex:      originIdx,
          convergenceCardIndex: convergenceIdx === -1 ? null : convergenceIdx,
        };
      })
      .filter(r => r.originCardIndex !== -1);
  });

  // ── Path-row select ────────────────────────────────────────────────────────

  selectPath(pathSetId: string, pathId: string, e: Event): void {
    e.stopPropagation();
    this.pathCtx.selectPath(pathSetId, pathId);
  }

  selectedPathIdFor(pathSetId: string): string | undefined {
    return this.pathCtx.selectedPathIdFor(pathSetId);
  }

  // ── Pixel-geometry helpers for path rows ─────────────────────────────────
  // Returns left offset (px) from start of .track content for a card at index.

  cardLeft(cardIndex: number): number {
    return TRACK_PAD + cardIndex * (CARD_W + TRACK_GAP);
  }

  cardCenterX(cardIndex: number): number {
    return this.cardLeft(cardIndex) + CARD_W / 2;
  }

  rowLeft(row: PathRow): number {
    return this.cardLeft(row.originCardIndex);
  }

  rowWidth(row: PathRow): number {
    const endIdx  = row.convergenceCardIndex ?? (this.trackItems().length - 1);
    const safeEnd = Math.max(endIdx, row.originCardIndex);
    // span from left edge of origin card to right edge of convergence card; gap handles itself in flex
    return this.cardLeft(safeEnd) + CARD_W - this.cardLeft(row.originCardIndex);
  }

  // ── Convenience alias (trackItems is cards-only now) ─────────────────────

  readonly cardItems = this.trackItems;

  // ── Drag state ────────────────────────────────────────────────────────────

  dragState     = signal<DragMode>(null);
  slotIndex     = signal<number | null>(null);
  ghostX        = signal(0);
  ghostY        = signal(0);
  hoveredCardId = signal<string | null>(null);

  private readonly onMouseMove = (e: MouseEvent) => {
    this.ghostX.set(e.clientX + 14);
    this.ghostY.set(e.clientY + 14);
    this.updateSlot(e.clientX);
  };

  private readonly onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.cancelDrag();
  };

  private cardMidpoints: number[] = [];

  updateCardMidpoints(): void {
    const track = this.trackEl()?.nativeElement;
    if (!track) return;
    // Compute from track geometry rather than card DOM positions.
    // Reading individual card positions breaks when an active slot is rendered
    // inline in the flex track — it shifts every subsequent card and invalidates
    // the snapshot taken at drag-start.
    const trackLeft = track.getBoundingClientRect().left;
    const count = this.trackItems().length;
    this.cardMidpoints = Array.from({ length: count }, (_, i) =>
      trackLeft + TRACK_PAD + i * (CARD_W + TRACK_GAP) + CARD_W / 2
    );
  }

  updateSlot(clientX: number): void {
    this.updateCardMidpoints(); // recompute each call — scroll and slot DOM changes affect positions
    const mids = this.cardMidpoints;
    if (!mids.length) { this.slotIndex.set(0); return; }
    let idx = mids.length;
    for (let i = 0; i < mids.length; i++) {
      if (clientX < mids[i]) { idx = i; break; }
    }
    this.slotIndex.set(idx);
  }

  startMoving(ev: NarrativeEvent, e: MouseEvent): void {
    e.stopPropagation();
    this.dragState.set({ mode: 'moving', eventId: ev.id });
    this.ghostX.set(e.clientX + 14);
    this.ghostY.set(e.clientY + 14);
    setTimeout(() => this.updateCardMidpoints(), 0);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('keydown', this.onKeyDown);
  }

  startAdding(e: MouseEvent): void {
    this.dragState.set({ mode: 'adding' });
    this.ghostX.set(e.clientX + 14);
    this.ghostY.set(e.clientY + 14);
    setTimeout(() => this.updateCardMidpoints(), 0);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('keydown', this.onKeyDown);
  }

  cancelDrag(): void {
    this.dragState.set(null);
    this.slotIndex.set(null);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('keydown', this.onKeyDown);
  }

  commitOnBackdrop(): void {
    const idx = this.slotIndex();
    if (idx !== null) {
      this.commitSlot(idx);
    } else {
      this.cancelDrag();
    }
  }

  // Re-integrate a reordered visible subset back into the full event list.
  // Visible events occupy the same slots in the full order; hidden events stay put.
  // Returns the complete ordered ID list safe to pass to reorderNarrativeEvents.
  private mergeIntoFullOrder(reorderedVisible: NarrativeEvent[]): string[] {
    const visibleIds = new Set(reorderedVisible.map(e => e.id));
    const allSorted = this.store.narrativeEvents().slice().sort((a, b) => a.sortOrder - b.sortOrder);
    const full: NarrativeEvent[] = [];
    let vi = 0;
    for (const ev of allSorted) {
      full.push(visibleIds.has(ev.id) ? reorderedVisible[vi++] : ev);
    }
    return full.map(e => e.id);
  }

  async commitSlot(insertIndex: number): Promise<void> {
    const ds = this.dragState();
    const cards = this.cardItems();

    if (ds?.mode === 'moving') {
      const fromIdx = cards.findIndex(c => c.event.id === ds.eventId);
      if (fromIdx === -1) { this.cancelDrag(); return; }
      const evs = cards.map(c => c.event);
      const without = [...evs.slice(0, fromIdx), ...evs.slice(fromIdx + 1)];
      const insertAt = fromIdx < insertIndex ? insertIndex - 1 : insertIndex;
      const reorderedVisible = [...without.slice(0, insertAt), evs[fromIdx], ...without.slice(insertAt)];
      this.cancelDrag();
      await this.store.reorderNarrativeEvents(this.mergeIntoFullOrder(reorderedVisible));
    } else if (ds?.mode === 'adding') {
      this.cancelDrag();
      this.addEventAt.emit(insertIndex);
    } else {
      // Static slot click — add event at this position
      this.addEventAt.emit(insertIndex);
    }
  }

  async moveLeft(ev: NarrativeEvent): Promise<void> {
    const cards = this.cardItems();
    const i = cards.findIndex(c => c.event.id === ev.id);
    if (i <= 0) return;
    const evs = cards.map(c => c.event);
    const swapped = [...evs];
    [swapped[i - 1], swapped[i]] = [swapped[i], swapped[i - 1]];
    await this.store.reorderNarrativeEvents(this.mergeIntoFullOrder(swapped));
  }

  async moveRight(ev: NarrativeEvent): Promise<void> {
    const cards = this.cardItems();
    const i = cards.findIndex(c => c.event.id === ev.id);
    if (i >= cards.length - 1) return;
    const evs = cards.map(c => c.event);
    const swapped = [...evs];
    [swapped[i], swapped[i + 1]] = [swapped[i + 1], swapped[i]];
    await this.store.reorderNarrativeEvents(this.mergeIntoFullOrder(swapped));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  hasOverride(eventId: string, pathId: string | null): boolean {
    if (!pathId) return false;
    const activePathIds = new Set([pathId]);
    return this.store.overrideForEvent()(eventId, activePathIds) !== undefined;
  }

  isDragging(eventId: string): boolean {
    const ds = this.dragState();
    return ds?.mode === 'moving' && ds.eventId === eventId;
  }

  scrollToEvent(eventId: string): void {
    const track = this.trackEl()?.nativeElement;
    if (!track) return;
    const cards = Array.from(track.querySelectorAll<HTMLElement>('.card-outer'));
    const idx = this.trackItems().findIndex(c => c.event.id === eventId);
    if (idx !== -1 && cards[idx]) {
      cards[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  cardIndexOf(eventId: string): number {
    return this.trackItems().findIndex(c => c.event.id === eventId);
  }

  trackByItem(_: number, item: TrackItem): string {
    return item.event.id;
  }

  trackByPathRow(_: number, row: PathRow): string {
    return row.pathSetId;
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('keydown', this.onKeyDown);
  }
}
