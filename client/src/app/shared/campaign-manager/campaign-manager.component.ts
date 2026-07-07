import { Component, input, output, signal, computed, inject, effect } from '@angular/core';
import { AppStore } from '../../store/app.store';
import { Campaign } from '../../core/models/types';

export type CampaignManagerMode = 'new' | 'manage' | 'import' | null;

@Component({
  selector: 'app-campaign-manager',
  standalone: true,
  imports: [],
  templateUrl: './campaign-manager.component.html',
  styleUrl: './campaign-manager.component.scss',
})
export class CampaignManagerComponent {
  mode = input.required<CampaignManagerMode>();
  closed = output<void>();

  store = inject(AppStore);

  readonly open = computed(() => this.mode() !== null);

  readonly title = computed(() => {
    switch (this.mode()) {
      case 'new':    return 'New Campaign';
      case 'manage': return 'Campaigns';
      case 'import': return 'Import Campaign';
      default:       return '';
    }
  });

  constructor() {
    effect(() => {
      this.mode();
      this.editingId.set(null);
      this.deletingId.set(null);
      this.deleteConfirmText.set('');
      this.createName.set('');
      this.createDescription.set('');
      this.resetImport();
    });
  }

  // ── New modal ─────────────────────────────────────────────────────────────
  createName = signal('');
  createDescription = signal('');

  submitCreate(): void {
    const name = this.createName().trim();
    if (!name) return;
    this.store.createCampaign(name, this.createDescription().trim() || undefined);
    this.createName.set('');
    this.createDescription.set('');
  }

  // ── Manage modal ──────────────────────────────────────────────────────────
  editingId = signal<string | null>(null);
  editName = signal('');
  editDescription = signal('');

  loadCampaign(id: string): void {
    this.store.switchCampaign(id);
  }

  startEdit(campaign: Campaign): void {
    this.editingId.set(campaign.id);
    this.editName.set(campaign.name);
    this.editDescription.set(campaign.description ?? '');
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  submitEdit(): void {
    const id = this.editingId();
    const name = this.editName().trim();
    if (!id || !name) return;
    const original = this.store.campaigns().find(c => c.id === id);
    if (!original) return;
    this.store.updateCampaign({ ...original, name, description: this.editDescription().trim() || undefined });
    this.editingId.set(null);
  }

  deletingId = signal<string | null>(null);
  deleteConfirmText = signal('');

  readonly campaignToDelete = computed(() =>
    this.store.campaigns().find(c => c.id === this.deletingId()) ?? null
  );

  readonly deleteEnabled = computed(() => {
    const target = this.campaignToDelete();
    return target !== null && this.deleteConfirmText() === target.name;
  });

  readonly canDelete = computed(() => this.store.campaigns().length > 1);

  startDelete(campaign: Campaign): void {
    this.deletingId.set(campaign.id);
    this.deleteConfirmText.set('');
  }

  cancelDelete(): void {
    this.deletingId.set(null);
    this.deleteConfirmText.set('');
  }

  submitDelete(): void {
    if (!this.deleteEnabled()) return;
    const id = this.deletingId()!;
    this.store.deleteCampaign(id);
    if (this.store.activeCampaign()?.id === id) {
      const remaining = this.store.campaigns().filter(c => c.id !== id);
      if (remaining.length > 0) this.store.switchCampaign(remaining[0].id);
    }
    this.deletingId.set(null);
    this.deleteConfirmText.set('');
  }

  // ── Import modal ──────────────────────────────────────────────────────────
  importSourceId = signal<string | null>(null);
  importFactions = signal(false);
  importCharacters = signal(false);
  importPartyMembers = signal(false);
  importAll = signal(false);
  importing = signal(false);
  importDone = signal(false);

  readonly importSources = computed(() =>
    this.store.campaigns().filter(c => c.id !== this.store.activeCampaign()?.id)
  );

  readonly importReady = computed(() => {
    if (!this.importSourceId()) return false;
    return this.importAll() || this.importFactions() || this.importCharacters() || this.importPartyMembers();
  });

  readonly factionWarning = computed(() =>
    (this.importCharacters() || this.importPartyMembers()) && !this.importFactions() && !this.importAll()
  );

  toggleImportAll(checked: boolean): void {
    this.importAll.set(checked);
    if (checked) {
      this.importFactions.set(false);
      this.importCharacters.set(false);
      this.importPartyMembers.set(false);
    }
  }

  submitImport(): void {
    const sourceId = this.importSourceId();
    if (!sourceId || !this.importReady()) return;
    this.importing.set(true);
    this.importDone.set(false);

    const types: string[] = [];
    if (this.importFactions()) types.push('factions');
    if (this.importCharacters()) types.push('characters');
    if (this.importPartyMembers()) types.push('partyMembers');

    this.store.importEntities(sourceId, types, this.importAll());
    setTimeout(() => {
      this.importing.set(false);
      this.importDone.set(true);
    }, 600);
  }

  resetImport(): void {
    this.importSourceId.set(null);
    this.importFactions.set(false);
    this.importCharacters.set(false);
    this.importPartyMembers.set(false);
    this.importAll.set(false);
    this.importing.set(false);
    this.importDone.set(false);
  }

  // ── Shared ────────────────────────────────────────────────────────────────
  close(): void {
    this.closed.emit();
  }
}
