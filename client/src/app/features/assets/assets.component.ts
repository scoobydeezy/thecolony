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
  statusActorFactionId: string;
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
  statusActorFactionId: '',
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
  statusActorFactionId: a.statusActorFactionId ?? '',
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
  statusActorFactionId: fm.status !== 'Stable' ? (fm.statusActorFactionId || undefined) : undefined,
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
    const filtered = t === 'all' ? assets : assets.filter(a => a.type === t);
    return [...filtered].sort((a, b) => {
      const key = (name: string) => name.replace(/^the\s+/i, '').toLowerCase();
      return key(a.name).localeCompare(key(b.name));
    });
  });

  factionName(id: string | undefined): string {
    if (!id) return '—';
    return this.store.factions().find(f => f.id === id)?.name ?? '—';
  }

  factionFlair(factionId: string | undefined): { bg: string; iconColor: string; iconPath?: string; bannerShape: string; name: string } | null {
    if (!factionId) return null;
    const f = this.store.factions().find(f => f.id === factionId);
    if (!f) return null;
    const bg = f.secondaryColor || '#1e293b';
    return {
      name:        f.name,
      bg,
      iconColor:   f.primaryColor   || '#ffffff',
      iconPath:    f.iconPath       || undefined,
      bannerShape: f.bannerShape    || 'centered-triangle',
    };
  }

  readonly STATUS_SLOTS: AssetStatus[] = ['Stable', 'Contested', 'Damaged', 'Destroyed'];

  readonly TYPE_ICONS: Record<AssetType, string> = {
    Infrastructure: 'fa-duotone fa-landmark',
    Artifact:       'fa-duotone fa-ring',
    Resource:       'fa-duotone fa-treasure-chest',
    Intelligence:   'fa-duotone fa-scroll-old',
  };

  readonly ROLE_HINTS: Record<AssetRole, string> = {
    Operational: 'Balanced — contributes equally to Influence and Legitimacy (×1.0 / ×1.0).',
    Strategic:   'Power-forward — high Influence, weak Legitimacy (×1.25 / ×0.25). Use for military or logistical holdings.',
    Symbolic:    'Legitimacy-forward — weak Influence, high Legitimacy (×0.25 / ×1.25). Use for cultural or religious sites.',
    Covert:      'Covert — full Influence, zero Legitimacy (×1.0 / ×0). Asset is known only to the controlling faction.',
    Mandate:     'Civic — zero Influence, full Legitimacy (×0 / ×1.0). Derives power entirely from public recognition.',
  };

  slotIcon(status: AssetStatus): string {
    const map: Record<AssetStatus, string> = {
      Stable:    'fa-solid fa-house',
      Contested: 'fa-solid fa-shield-halved',
      Damaged:   'fa-solid fa-fire',
      Destroyed: 'fa-solid fa-skull',
    };
    return map[status];
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
      'Status', 'ControllingFactionId', 'StatusActorFactionId', 'Location', 'Description',
    ];
    const rows = this.store.assets().map(a => [
      a.id, a.name, a.type, a.role, a.tier, a.keystone,
      a.status, a.controllingFactionId ?? '', a.statusActorFactionId ?? '',
      a.location ?? '', a.description ?? '',
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
      Stable:    'status-stable',
      Contested: 'status-contested',
      Damaged:   'status-damaged',
      Destroyed: 'status-destroyed',
    };
    return map[status];
  }
}
