import { Injectable, computed, inject } from '@angular/core';
import { AppStore } from '../../../store/app.store';
import { PathContextService } from './path-context.service';
import { NarrativeThread } from '../../../core/models/types';

export interface EffectiveThreadSummary {
  thread: NarrativeThread;
  eventIds: string[];
  characterIds: string[];
  assetIds: string[];
  timelineLabel: string;
}

/**
 * Derives thread summaries from effective connections under the active path context.
 * An event carries a thread if any effective connection (base or override) incident
 * to that event has threadId === this thread's id.
 */
@Injectable({ providedIn: 'root' })
export class NarrativeThreadSummaryService {
  private readonly store   = inject(AppStore);
  private readonly pathCtx = inject(PathContextService);

  readonly summaries = computed<Map<string, EffectiveThreadSummary>>(() => {
    const activePathIds          = this.pathCtx.activePathIds();
    const threads                = this.store.narrativeThreads();
    const events                 = this.store.narrativeEvents();
    const pathSets               = this.store.pathSets();
    const narrativePaths         = this.store.narrativePaths();
    const pathSetContexts        = this.store.pathSetContexts();
    const effectiveConnsFn       = this.store.effectiveConnectionsForEvent();
    const effectiveEntityLinksFn = this.store.effectiveEntityLinksForEvent();

    // Build threadId → Set<eventId> from effective connections for each event
    const threadToEvents = new Map<string, Set<string>>();
    for (const t of threads) threadToEvents.set(t.id, new Set());

    for (const ev of events) {
      const conns = effectiveConnsFn(ev.id, activePathIds);
      for (const c of conns) {
        if (!c.threadId) continue;
        if (!threadToEvents.has(c.threadId)) continue;
        // Both endpoints of each connection carry the thread
        threadToEvents.get(c.threadId)!.add(c.sourceNarrativeEventId);
        threadToEvents.get(c.threadId)!.add(c.targetNarrativeEventId);
      }
    }

    // Precompute effective entity links per event
    const linksByEvent = new Map<string, { entityType: string; entityId: string }[]>();
    for (const ev of events) {
      linksByEvent.set(ev.id, effectiveEntityLinksFn(ev.id, activePathIds));
    }

    // Applicable PathSets under current context
    const applicablePathSetIds = new Set<string>();
    for (const ps of pathSets) {
      const required = pathSetContexts
        .filter(c => c.pathSetId === ps.id)
        .map(c => c.requiredPathId);
      if (required.every(id => activePathIds.has(id))) {
        applicablePathSetIds.add(ps.id);
      }
    }

    // For timeline counting: pathSetId → pathId[]
    const pathSetPaths = new Map<string, string[]>();
    for (const p of narrativePaths) {
      if (!pathSetPaths.has(p.pathSetId)) pathSetPaths.set(p.pathSetId, []);
      pathSetPaths.get(p.pathSetId)!.push(p.id);
    }

    const result = new Map<string, EffectiveThreadSummary>();

    for (const thread of threads) {
      const eventIds = Array.from(threadToEvents.get(thread.id) ?? []);

      const characterIds: string[] = [];
      const assetIds: string[] = [];
      const seenChars  = new Set<string>();
      const seenAssets = new Set<string>();

      for (const eid of eventIds) {
        for (const l of (linksByEvent.get(eid) ?? [])) {
          if (l.entityType === 'Character' && !seenChars.has(l.entityId)) {
            seenChars.add(l.entityId);
            characterIds.push(l.entityId);
          }
          if (l.entityType === 'Asset' && !seenAssets.has(l.entityId)) {
            seenAssets.add(l.entityId);
            assetIds.push(l.entityId);
          }
        }
      }

      // Timeline count: number of individual paths on which this thread has
      // at least one incident effective connection.
      let timelineCount = 0;
      if (activePathIds.size > 0) {
        for (const psId of applicablePathSetIds) {
          const paths = pathSetPaths.get(psId) ?? [];
          for (const pathId of paths) {
            const testActive = new Set(activePathIds);
            for (const pid of paths) testActive.delete(pid);
            testActive.add(pathId);

            const appearsOnPath = events.some(ev => {
              const conns = effectiveConnsFn(ev.id, testActive);
              return conns.some(c => c.threadId === thread.id);
            });
            if (appearsOnPath) timelineCount++;
          }
        }
      }

      const timelineLabel =
        timelineCount === 0 ? '' :
        timelineCount === 1 ? '1 path' :
        `${timelineCount} paths`;

      result.set(thread.id, { thread, eventIds, characterIds, assetIds, timelineLabel });
    }

    return result;
  });

  summaryFor(threadId: string): EffectiveThreadSummary | undefined {
    return this.summaries().get(threadId);
  }
}
