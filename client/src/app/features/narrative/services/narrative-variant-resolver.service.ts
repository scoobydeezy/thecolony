import { Injectable, inject } from '@angular/core';
import { AppStore } from '../../../store/app.store';
import {
  NarrativeEvent, EffectiveNarrativeEvent, NarrativeEventOverride,
} from '../../../core/models/types';

/**
 * Resolves the effective (display) values for a NarrativeEvent given a set of
 * active NarrativePath IDs.  Implements "most-specific-wins" per property:
 *  - An override applies only when ALL its required paths (EventOverridePaths)
 *    are a subset of the active path set.
 *  - Among applicable overrides, most paths required = most specific = wins.
 *  - Null scalar on an applicable override inherits from base event.
 */
@Injectable({ providedIn: 'root' })
export class NarrativeVariantResolverService {
  private store = inject(AppStore);

  resolve(event: NarrativeEvent, activePathIds: ReadonlySet<string>): EffectiveNarrativeEvent {
    const overrides    = this.store.narrativeEventOverrides().filter(o => o.narrativeEventId === event.id);
    const overridePaths = this.store.eventOverridePaths();

    // Collect applicable overrides (all required paths are active)
    const applicable = overrides.filter(o => {
      const required = overridePaths.filter(op => op.eventOverrideId === o.id).map(op => op.pathId);
      return required.length > 0 && required.every(id => activePathIds.has(id));
    });

    if (applicable.length === 0) {
      return this.baseEffective(event);
    }

    // Most specific = most required paths
    const pathCountFor = (o: NarrativeEventOverride) =>
      overridePaths.filter(op => op.eventOverrideId === o.id).length;

    applicable.sort((a, b) => pathCountFor(b) - pathCountFor(a));
    const best = applicable[0];

    // Resolve per property independently (most-specific wins)
    let summary     = event.summary;
    let description = event.description;
    for (const o of applicable) {
      if (summary     === event.summary     && o.overridesSummary)     summary     = o.summary;
      if (description === event.description && o.overridesDescription) description = o.description;
    }

    return {
      ...event,
      effectiveSummary:     summary,
      effectiveDescription: description,
      overrideId: best.id,
    };
  }

  private baseEffective(event: NarrativeEvent): EffectiveNarrativeEvent {
    return {
      ...event,
      effectiveSummary:     event.summary,
      effectiveDescription: event.description,
      overrideId: undefined,
    };
  }
}
