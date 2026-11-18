import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { ApiService } from './core/services/api.service';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AppStore } from './store/app.store';
import { SettingsDrawerComponent } from './shared/settings-drawer/settings-drawer.component';
import { CampaignManagerComponent, CampaignManagerMode } from './shared/campaign-manager/campaign-manager.component';
import { NarrativeInspectorComponent } from './shared/narrative-inspector/narrative-inspector.component';

import { ToastsComponent } from './shared/toast/toast.component';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SettingsDrawerComponent, CampaignManagerComponent, NarrativeInspectorComponent, ToastsComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  store = inject(AppStore);

  readonly partyName = computed(() => this.store.colonyState()?.partyName || 'Party');

  // §12: records whose canonical file is missing (deleted or broken outside the app). Never deleted
  // automatically: flagged here until the file is restored, or the record is deleted through the app.
  readonly missingCanon = computed(() => [
    ...this.store.characters().filter(x => x.canonMissing).map(x => ({ kind: 'Character', id: x.canonId })),
    ...this.store.factions().filter(x => x.canonMissing).map(x => ({ kind: 'Faction', id: x.canonId })),
    ...this.store.assets().filter(x => x.canonMissing).map(x => ({ kind: 'Asset', id: x.canonId })),
    ...this.store.locations().filter(x => x.canonMissing).map(x => ({ kind: 'Location', id: x.canonId })),
    ...this.store.factionGoals().filter(x => x.canonMissing).map(x => ({ kind: 'Goal', id: x.canonId })),
  ]);

  // §12: references to entries that no longer exist, from the server's canon status. Re-checked
  // whenever an entity list changes (a delete through the app is the usual cause).
  private readonly api = inject(ApiService);
  readonly staleRefs = signal<{ from: string; path: string; to: string }[]>([]);
  /** Stale references grouped by the missing entry they name, most-referenced first. */
  readonly staleByTarget = computed(() => {
    const groups = new Map<string, number>();
    for (const r of this.staleRefs()) groups.set(r.to, (groups.get(r.to) ?? 0) + 1);
    return [...groups.entries()].map(([to, count]) => ({ to, count })).sort((a, b) => b.count - a.count || a.to.localeCompare(b.to));
  });

  constructor() {
    effect(() => {
      this.store.characters(); this.store.factions(); this.store.assets(); this.store.locations(); this.store.factionGoals();
      this.api.getCanonStatus().subscribe({ next: (s) => this.staleRefs.set(s.staleReferences ?? []), error: () => this.staleRefs.set([]) });
    });
  }
  readonly viewMenuOpen = signal(false);
  readonly settingsOpen = signal(false);
  readonly campaignManagerMode = signal<CampaignManagerMode>(null);

  // Ordered list: baseline, ...sessions ascending by number, current
  private readonly viewContexts = computed(() => [
    'baseline',
    ...[...this.store.sortedSessions()].sort((a, b) => a.number - b.number).map(s => s.id),
    'current',
  ]);

  readonly canStepBack = computed(() => {
    const ctxs = this.viewContexts();
    return ctxs.indexOf(this.store.viewingContext()) > 0;
  });

  readonly canStepForward = computed(() => {
    const ctxs = this.viewContexts();
    const idx = ctxs.indexOf(this.store.viewingContext());
    return idx >= 0 && idx < ctxs.length - 1;
  });

  stepBack(): void {
    const ctxs = this.viewContexts();
    const idx = ctxs.indexOf(this.store.viewingContext());
    if (idx > 0) this.store.setViewingContext(ctxs[idx - 1]);
  }

  stepForward(): void {
    const ctxs = this.viewContexts();
    const idx = ctxs.indexOf(this.store.viewingContext());
    if (idx < ctxs.length - 1) this.store.setViewingContext(ctxs[idx + 1]);
  }

  jumpToBaseline(): void {
    this.store.setViewingContext('baseline');
  }

  jumpToCurrent(): void {
    this.store.setViewingContext('current');
  }

  ngOnInit() {
    this.store.loadSettings(undefined);
    this.store.loadCampaigns(undefined);
    this.store.loadFactions(undefined);
    this.store.loadColonyState(undefined);
    this.store.loadRelationships(undefined);
    this.store.loadOverrides(undefined);
    this.store.loadRules(undefined);
    this.store.loadSessionLog(undefined);
    this.store.loadCharacters(undefined);
    this.store.loadSessions(undefined);
    this.store.loadAssets(undefined);
    this.store.loadFactionGoals(undefined);
    this.store.loadWorldConditions(undefined);
    this.store.loadLocations(undefined);
    this.store.loadColonyMaps(undefined);
    this.store.loadMapPlacements(undefined);
  }

  stressClass(): string {
    const s = this.store.viewColonyStress();
    if (s <= 3) return 'stress-value stress-low';
    if (s <= 6) return 'stress-value stress-mid';
    return 'stress-value stress-high';
  }

  /** Tooltip: where the viewed Colony Stress comes from (§18.10: only from the World Conditions in force). */
  stressTitle(): string {
    const b = this.store.viewStressBreakdown();
    if (!b.parts.length) return 'Colony Stress 0/10: no World Condition in force adds Stress';
    const sign = (n: number) => (n > 0 ? '+' : '') + n;
    const sum = b.parts.reduce((t, p) => t + p.stress, 0);
    return [...b.parts.map(p => `${p.title} ${sign(p.stress)} (${p.origin})`),
            `= ${b.total}/10${sum !== b.total ? ' (clamped)' : ''}`].join('\n');
  }

  toggleViewMenu(): void {
    this.viewMenuOpen.update(v => !v);
  }

  closeViewMenu(): void {
    this.viewMenuOpen.set(false);
  }

  setViewing(ctx: string): void {
    this.store.setViewingContext(ctx);
    this.viewMenuOpen.set(false);
  }

  openSettings(): void {
    this.settingsOpen.set(true);
  }

  closeSettings(): void {
    this.settingsOpen.set(false);
  }

  openCampaignManager(mode: CampaignManagerMode): void {
    this.campaignManagerMode.set(mode);
  }

  closeCampaignManager(): void {
    this.campaignManagerMode.set(null);
  }
}
