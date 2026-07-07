import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AppStore } from './store/app.store';
import { SettingsDrawerComponent } from './shared/settings-drawer/settings-drawer.component';
import { CampaignManagerComponent, CampaignManagerMode } from './shared/campaign-manager/campaign-manager.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SettingsDrawerComponent, CampaignManagerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  store = inject(AppStore);

  readonly partyName = computed(() => this.store.colonyState()?.partyName || 'Party');
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
  }

  stressClass(): string {
    const s = this.store.colonyState()?.colonyStress ?? 0;
    if (s <= 3) return 'stress-value stress-low';
    if (s <= 6) return 'stress-value stress-mid';
    return 'stress-value stress-high';
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
