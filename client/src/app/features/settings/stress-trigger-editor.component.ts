import { Component, inject, input, output, signal, effect, computed, untracked } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { OrValueRowComponent } from './or-value-row.component';
import { AppStore } from '../../store/app.store';
import {
  StressTrigger, StressTriggerEntityType,
  ASSET_STATUS_OPTIONS, ASSET_TYPE_OPTIONS,
  GOAL_STATUS_OPTIONS, GOAL_PRIORITY_OPTIONS,
  CHARACTER_STATE_OPTIONS, CHARACTER_SUBTYPE_OPTIONS,
} from '../../core/models/types';

interface EntityTypeOption { value: StressTriggerEntityType; label: string; }
const ENTITY_TYPE_OPTIONS: EntityTypeOption[] = [
  { value: 'asset',     label: 'Asset' },
  { value: 'goal',      label: 'Goal' },
  { value: 'character', label: 'Character' },
  { value: 'faction',   label: 'Faction' },
];

const PROPERTY_OPTIONS: Record<StressTriggerEntityType, { value: string; label: string }[]> = {
  asset:     [{ value: 'status', label: 'Status' }],
  goal:      [{ value: 'status', label: 'Status' }],
  character: [{ value: 'state',  label: 'State' }],
  faction:   [],
};

const VALUE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  'asset:status':    ASSET_STATUS_OPTIONS,
  'goal:status':     GOAL_STATUS_OPTIONS,
  'character:state': CHARACTER_STATE_OPTIONS,
};

const SUBTYPE_OPTIONS: Record<StressTriggerEntityType, { value: string; label: string }[]> = {
  asset:     [{ value: '', label: 'Any type' },     ...ASSET_TYPE_OPTIONS],
  goal:      [{ value: '', label: 'Any priority' }, ...GOAL_PRIORITY_OPTIONS],
  character: [{ value: '', label: 'Any type' },     ...CHARACTER_SUBTYPE_OPTIONS],
  faction:   [],
};

@Component({
  selector: 'app-stress-trigger-editor',
  standalone: true,
  imports: [FormField, OrValueRowComponent],
  templateUrl: './stress-trigger-editor.component.html',
  styleUrl: './stress-triggers-tab.component.scss',
})
export class StressTriggerEditorComponent {
  store = inject(AppStore);

  trigger = input.required<StressTrigger>();
  remove  = output<void>();
  change  = output<StressTrigger>();

  readonly triggerModel = signal<StressTrigger>({} as StressTrigger);
  readonly triggerForm  = form(this.triggerModel);

  readonly entityTypeOptions = ENTITY_TYPE_OPTIONS;

  readonly entityOptions = computed(() => ({
    asset:     this.store.assets().map(a => ({ value: a.id, label: a.name })),
    goal:      this.store.factionGoals().map(g => ({ value: g.id, label: g.title })),
    character: this.store.characters().map(c => ({ value: c.id, label: c.name })),
    faction:   this.store.factions().filter(f => f.active).map(f => ({ value: f.id, label: f.name })),
  }));

  constructor() {
    effect(() => {
      const incoming = this.trigger();
      if (JSON.stringify(incoming) !== JSON.stringify(untracked(this.triggerModel)))
        this.triggerModel.set({ ...incoming });
    });
    effect(() => {
      const current = this.triggerModel();
      if (JSON.stringify(current) !== JSON.stringify(untracked(this.trigger)))
        this.change.emit(current);
    });
  }

  propertyOptions(t: StressTrigger) { return PROPERTY_OPTIONS[t.sourceEntityType] ?? []; }
  valueOptions(t: StressTrigger)    { return VALUE_OPTIONS[`${t.sourceEntityType}:${t.sourceProperty}`] ?? []; }
  subtypeOptions(t: StressTrigger)  { return SUBTYPE_OPTIONS[t.sourceEntityType] ?? []; }
  hasSubtype(t: StressTrigger)      { return SUBTYPE_OPTIONS[t.sourceEntityType]?.length > 0; }
  specificEntityOptions(t: StressTrigger) { return this.entityOptions()[t.sourceEntityType] ?? []; }

  patch(p: Partial<StressTrigger>): void {
    this.triggerModel.update(t => {
      const updated = { ...t, ...p };
      if (p.sourceEntityType) {
        updated.sourceProperty     = PROPERTY_OPTIONS[p.sourceEntityType]?.[0]?.value ?? 'status';
        updated.sourcePropertyValue = [];
        updated.sourceEntitySubtype = undefined;
        updated.sourceEntityId      = undefined;
      }
      if (p.sourceProperty) {
        updated.sourcePropertyValue = [];
      }
      return updated;
    });
  }

  addValue(): void {
    const t = this.triggerModel();
    const opts = this.valueOptions(t);
    const existing = t.sourcePropertyValue ?? [];
    const next = opts.find(o => !existing.includes(o.value))?.value;
    if (!next) return;
    this.triggerModel.update(r => ({ ...r, sourcePropertyValue: [...(r.sourcePropertyValue ?? []), next] }));
  }

  setValue(index: number, value: string): void {
    this.triggerModel.update(t => {
      const vals = [...(t.sourcePropertyValue ?? [])];
      vals[index] = value;
      return { ...t, sourcePropertyValue: vals };
    });
  }

  removeValue(index: number): void {
    this.triggerModel.update(t => ({
      ...t,
      sourcePropertyValue: (t.sourcePropertyValue ?? []).filter((_, i) => i !== index),
    }));
  }

  triggerPreview(t: StressTrigger): string {
    const vals = t.sourcePropertyValue?.length ? t.sourcePropertyValue.join(' | ') : 'any';
    const delta = t.flatDelta >= 0 ? `+${t.flatDelta}` : `${t.flatDelta}`;
    const shot = t.oneShot ? ' [once per entity]' : ' [every session]';
    let subject: string;
    if (t.sourceEntityId) {
      const name = this.specificEntityOptions(t).find(o => o.value === t.sourceEntityId)?.label ?? t.sourceEntityId;
      subject = `"${name}"`;
    } else {
      const subtype = t.sourceEntitySubtype ? ` (${t.sourceEntitySubtype})` : '';
      subject = `${t.sourceEntityType}${subtype}`;
    }
    return `When ${subject} ${t.sourceProperty} → ${vals}: stress ${delta}${shot}`;
  }
}
