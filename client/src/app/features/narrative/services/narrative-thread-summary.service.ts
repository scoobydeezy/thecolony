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
 * Derives thread summaries from the currently effective Narrative Events,
 * respecting the active Path context and EventOverride thread replacements.
 *
 * An event carries a thread if:
 *   - The base NarrativeThreadEvent join exists AND no applicable override
 *     has overridesThreads=true for this event, OR
 *   - An applicable override has overridesThreads=true and includes the
 *     thread in its EventOverrideThreads list.
 *
 * Characters and assets are aggregated from NarrativeEntityLink records
 * (ownerType='Event') on events that carry the thread.
 *
 * Timeline label counts the PathSets for which at least one event carries
 * the thread on any path within that set.
 */
@Injectable({ providedIn: 'root' })
export class NarrativeThreadSummaryService {
  private readonly store   = inject(AppStore);
  private readonly pathCtx = inject(PathContextService);

  /** Map from threadId → EffectiveThreadSummary, recomputed on any relevant change. */
  readonly summaries = computed<Map<string, EffectiveThreadSummary>>(() => {
    const activePathIds           = this.pathCtx.activePathIds();
    const threads                 = this.store.narrativeThreads();
    const events                  = this.store.narrativeEvents();
    const baseThreadEvents        = this.store.narrativeThreadEvents();
    const overrides               = this.store.narrativeEventOverrides();
    const overridePaths           = this.store.eventOverridePaths();
    const overrideThreads         = this.store.eventOverrideThreads();
    const pathSets                = this.store.pathSets();
    const narrativePaths          = this.store.narrativePaths();
    const pathSetContexts         = this.store.pathSetContexts();
    const effectiveEntityLinksFn  = this.store.effectiveEntityLinksForEvent();

    // Build a lookup: eventId → best applicable override (if any)
    const bestOverride = new Map<string, typeof overrides[number] | null>();
    for (const ev of events) {
      const applicable = overrides.filter(o => {
        if (o.narrativeEventId !== ev.id) return false;
        const required = overridePaths
          .filter(op => op.eventOverrideId === o.id)
          .map(op => op.pathId);
        return required.length > 0 && required.every(id => activePathIds.has(id));
      });
      if (applicable.length === 0) {
        bestOverride.set(ev.id, null);
        continue;
      }
      applicable.sort((a, b) =>
        overridePaths.filter(op => op.eventOverrideId === b.id).length -
        overridePaths.filter(op => op.eventOverrideId === a.id).length
      );
      bestOverride.set(ev.id, applicable[0]);
    }

    // Build: threadId → Set<eventId> (effective carrying events)
    const threadToEvents = new Map<string, Set<string>>();
    for (const t of threads) threadToEvents.set(t.id, new Set());

    for (const ev of events) {
      const override = bestOverride.get(ev.id) ?? null;

      if (override?.overridesThreads) {
        // Override replaces the thread list — use EventOverrideThreads for this override
        const effectiveThreadIds = overrideThreads
          .filter(ot => ot.eventOverrideId === override.id)
          .map(ot => ot.narrativeThreadId);
        for (const tid of effectiveThreadIds) {
          if (!threadToEvents.has(tid)) continue;
          threadToEvents.get(tid)!.add(ev.id);
        }
      } else {
        // No override or override doesn't touch threads — use base joins
        const baseThreadIds = baseThreadEvents
          .filter(te => te.narrativeEventId === ev.id)
          .map(te => te.narrativeThreadId);
        for (const tid of baseThreadIds) {
          if (!threadToEvents.has(tid)) continue;
          threadToEvents.get(tid)!.add(ev.id);
        }
      }
    }

    // Precompute effective entity links by event for fast lookup (path-aware)
    const linksByEvent = new Map<string, { entityType: string; entityId: string }[]>();
    for (const ev of events) {
      linksByEvent.set(ev.id, effectiveEntityLinksFn(ev.id, activePathIds));
    }

    // Compute which PathSets are applicable under current active paths
    const applicablePathSetIds = new Set<string>();
    for (const ps of pathSets) {
      const required = pathSetContexts
        .filter(c => c.pathSetId === ps.id)
        .map(c => c.requiredPathId);
      if (required.every(id => activePathIds.has(id))) {
        applicablePathSetIds.add(ps.id);
      }
    }

    // For timeline counting: build pathSetId → Set<pathId>
    const pathSetPaths = new Map<string, string[]>();
    for (const p of narrativePaths) {
      if (!pathSetPaths.has(p.pathSetId)) pathSetPaths.set(p.pathSetId, []);
      pathSetPaths.get(p.pathSetId)!.push(p.id);
    }

    // Assemble summaries
    const result = new Map<string, EffectiveThreadSummary>();

    for (const thread of threads) {
      const eventIds = Array.from(threadToEvents.get(thread.id) ?? []);

      const characterIds: string[] = [];
      const assetIds: string[] = [];
      const seenChars = new Set<string>();
      const seenAssets = new Set<string>();

      for (const eid of eventIds) {
        const links = linksByEvent.get(eid) ?? [];
        for (const l of links) {
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

      // Timeline label: count the number of individual paths (across all applicable
      // PathSets) on which this thread appears on at least one event.
      // A shared (unoverridden) thread counts on every path in the set because the
      // base join is path-agnostic and is visible under any path context.
      let timelineCount = 0;
      if (activePathIds.size > 0) {
        for (const psId of applicablePathSetIds) {
          const paths = pathSetPaths.get(psId) ?? [];
          for (const pathId of paths) {
            // Build a test context: replace this PathSet's current selection with pathId
            const testActive = new Set(activePathIds);
            for (const pid of paths) testActive.delete(pid);
            testActive.add(pathId);

            const appearsOnPath = events.some(ev => {
              const applicable = overrides.filter(o => {
                if (o.narrativeEventId !== ev.id) return false;
                const required = overridePaths
                  .filter(op => op.eventOverrideId === o.id)
                  .map(op => op.pathId);
                return required.length > 0 && required.every(id => testActive.has(id));
              });
              applicable.sort((a, b) =>
                overridePaths.filter(op => op.eventOverrideId === b.id).length -
                overridePaths.filter(op => op.eventOverrideId === a.id).length
              );
              const best = applicable[0] ?? null;

              if (best?.overridesThreads) {
                return overrideThreads.some(
                  ot => ot.eventOverrideId === best.id && ot.narrativeThreadId === thread.id
                );
              }
              // No override or override doesn't touch threads — shared base join is visible on every path
              return baseThreadEvents.some(
                te => te.narrativeEventId === ev.id && te.narrativeThreadId === thread.id
              );
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
