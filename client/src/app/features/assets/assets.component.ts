import { Component, inject, signal, computed } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { AppStore } from '../../store/app.store';
import {
  Asset, AssetType, AssetRole, AssetStatus,
  ASSET_TYPE_OPTIONS, ASSET_ROLE_OPTIONS, ASSET_STATUS_OPTIONS, ASSET_TIER_OPTIONS,
  computeAssetInfluence, computeAssetLegitimacy,
} from '../../core/models/types';
import { downloadCsv, parseCsv, csvHeaderMap } from '../../core/utils/csv-export';
import { oneOf } from '../../core/utils/validation';

interface AssetFormModel {
  id: string;
  name: string;
  description: string;
  type: AssetType;
  role: AssetRole;
  tier: string;
  keystone: boolean;
  status: AssetStatus;
  controllingFactionId: string;
  location: string;
}

const emptyForm = (): AssetFormModel => ({
  id: '',
  name: '',
  description: '',
  type: 'Infrastructure',
  role: 'Operational',
  tier: '3',
  keystone: false,
  status: 'Stable',
  controllingFactionId: '',
  location: '',
});

const toFormModel = (a: Asset): AssetFormModel => ({
  id: a.id,
  name: a.name,
  description: a.description ?? '',
  type: a.type,
  role: a.role,
  tier: a.tier.toString(),
  keystone: a.keystone,
  status: a.status,
  controllingFactionId: a.controllingFactionId ?? '',
  location: a.location ?? '',
});

const fromFormModel = (fm: AssetFormModel): Asset => ({
  id: fm.id,
  campaignId: '',
  name: fm.name.trim(),
  description: fm.description.trim() || undefined,
  type: fm.type,
  role: fm.role,
  tier: parseInt(fm.tier, 10) || 3,
  keystone: fm.keystone,
  status: fm.status,
  controllingFactionId: fm.controllingFactionId || undefined,
  location: fm.location.trim() || undefined,
});

@Component({
  selector: 'app-assets',
  standalone: true,
  imports: [FormField],
  templateUrl: './assets.component.html',
  styleUrl: './assets.component.scss',
})
export class AssetsComponent {
  store = inject(AppStore);

  readonly typeOptions   = ASSET_TYPE_OPTIONS;
  readonly roleOptions   = ASSET_ROLE_OPTIONS;
  readonly tierOptions   = ASSET_TIER_OPTIONS;
  readonly statusOptions = ASSET_STATUS_OPTIONS;

  computedInfluence  = computeAssetInfluence;
  computedLegitimacy = computeAssetLegitimacy;

  readonly showModal = signal(false);
  readonly editForm = signal<AssetFormModel>(emptyForm());
  readonly f = form(this.editForm);
  readonly filterType = signal<AssetType | 'all'>('all');

  readonly activeFactions = computed(() =>
    this.store.factions().filter(f => f.active && f.type === 'Faction')
  );

  readonly displayAssets = computed(() => {
    const t = this.filterType();
    const assets = this.store.viewAssets();
    return t === 'all' ? assets : assets.filter(a => a.type === t);
  });

  factionName(id: string | undefined): string {
    if (!id) return '—';
    return this.store.factions().find(f => f.id === id)?.name ?? '—';
  }

  openAdd(): void {
    this.editForm.set(emptyForm());
    this.showModal.set(true);
  }

  openEdit(asset: Asset): void {
    this.editForm.set(toFormModel(asset));
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  save(): void {
    const fm = this.editForm();
    if (!fm.name.trim()) return;
    this.store.saveAsset(fromFormModel(fm));
    this.showModal.set(false);
  }

  delete(id: string): void {
    if (!confirm('Delete this asset?')) return;
    this.store.deleteAsset(id);
  }

  exportCsv(): void {
    const header = [
      'Id', 'Name', 'Type', 'Role', 'Tier', 'Keystone',
      'Status', 'ControllingFactionId', 'Location', 'Description',
    ];
    const rows = this.store.assets().map(a => [
      a.id, a.name, a.type, a.role, a.tier, a.keystone,
      a.status, a.controllingFactionId ?? '', a.location ?? '',
      a.description ?? '',
    ]);
    downloadCsv([header, ...rows], 'assets.csv');
  }

  importCsv(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(reader.result as string);
      if (rows.length < 2) return;
      const h = csvHeaderMap(rows[0]);
      const get = (row: string[], col: string) => row[h.get(col) ?? -1] ?? '';
      const validTypes    = ASSET_TYPE_OPTIONS.map(o => o.value);
      const validRoles    = ASSET_ROLE_OPTIONS.map(o => o.value);
      const validStatuses = ASSET_STATUS_OPTIONS.map(o => o.value);

      for (const row of rows.slice(1)) {
        const asset: Asset = {
          id:                   get(row, 'id'),
          campaignId:           '',
          name:                 get(row, 'name'),
          type:                 oneOf(get(row, 'type'), validTypes as AssetType[]) ?? 'Infrastructure',
          role:                 oneOf(get(row, 'role'), validRoles as AssetRole[]) ?? 'Operational',
          tier:                 parseInt(get(row, 'tier')) || 3,
          keystone:             get(row, 'keystone').toLowerCase() === 'true',
          status:               oneOf(get(row, 'status'), validStatuses as AssetStatus[]) ?? 'Stable',
          controllingFactionId: get(row, 'controllingfactionid') || undefined,
          location:             get(row, 'location') || undefined,
          description:          get(row, 'description') || undefined,
        };
        this.store.saveAsset(asset);
      }
      (event.target as HTMLInputElement).value = '';
    };
    reader.readAsText(file);
  }

  setStarValue(n: number): void {
    this.editForm.update(fm => ({ ...fm, tier: n.toString() }));
  }

  statusClass(status: AssetStatus): string {
    const map: Record<AssetStatus, string> = {
      Stable: 'status-stable',
      Contested: 'status-contested',
      Damaged: 'status-damaged',
      Destroyed: 'status-destroyed',
      Hidden: 'status-hidden',
      Lost: 'status-lost',
    };
    return map[status];
  }
}
