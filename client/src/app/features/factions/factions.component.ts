import { Component, computed, inject, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { AppStore } from '../../store/app.store';
import {
  Faction, Character, GroupType, RitualPosition, KnowledgePosition, ChangePosition,
  ValueVector, primaryValue, secondaryValue, sacrificedValue,
  beliefConflicts, BeliefConflicts, BELIEF_VALUE_ALIGNMENT,
  mostAlignedFactions, mostOpposedFactions, effectivePressure, topCompatibleFactions
} from '../../core/models/types';
import { TernaryPlotComponent, TernaryOverlayPoint } from '../../shared/ternary-plot/ternary-plot.component';
import { downloadCsv } from '../../core/utils/csv-export';


interface FactionFormModel {
  id: string;
  name: string;
  represents: string;
  type: string;
  coreTenet: string;
  certainOf: string;
  rightAbout: string;
  afraidOf: string;
  wrongAbout: string;
  singleSentence: string;
  ritual: string;
  knowledge: string;
  change: string;
  active: string;
  notes: string;
  sortOrder: number;
}

const DEFAULT_VALUES: ValueVector = { truth: 1/3, stability: 1/3, agency: 1/3 };

const emptyForm = (): FactionFormModel => ({
  id: '', name: '', represents: '', type: 'Faction',
  coreTenet: '', certainOf: '', rightAbout: '', afraidOf: '',
  wrongAbout: '', singleSentence: '',
  ritual: '', knowledge: '', change: '',
  active: 'true', notes: '', sortOrder: 0
});

const toFormModel = (f: Faction): FactionFormModel => ({
  id: f.id,
  name: f.name,
  represents: f.represents,
  type: f.type,
  coreTenet: f.coreTenet,
  certainOf: f.certainOf,
  rightAbout: f.rightAbout,
  afraidOf: f.afraidOf,
  wrongAbout: f.wrongAbout,
  singleSentence: f.singleSentence,
  ritual: f.ritual ?? '',
  knowledge: f.knowledge ?? '',
  change: f.change ?? '',
  active: f.active ? 'true' : 'false',
  notes: f.notes ?? '',
  sortOrder: f.sortOrder
});

const fromFormModel = (fm: FactionFormModel, values: ValueVector): Faction => ({
  id: fm.id,
  name: fm.name,
  represents: fm.represents,
  type: fm.type as GroupType,
  coreTenet: fm.coreTenet,
  certainOf: fm.certainOf,
  rightAbout: fm.rightAbout,
  afraidOf: fm.afraidOf,
  wrongAbout: fm.wrongAbout,
  singleSentence: fm.singleSentence,
  ritual: (fm.ritual as RitualPosition) || undefined,
  knowledge: (fm.knowledge as KnowledgePosition) || undefined,
  change: (fm.change as ChangePosition) || undefined,
  values,
  active: fm.active === 'true',
  notes: fm.notes || undefined,
  sortOrder: fm.sortOrder
});

@Component({
  selector: 'app-factions',
  standalone: true,
  imports: [FormField, TernaryPlotComponent],
  templateUrl: './factions.component.html',
  styleUrl: './factions.component.scss'
})
export class FactionsComponent {
  store = inject(AppStore);

  showModal = signal(false);
  detailFaction = signal<Faction | null>(null);
  filterType = signal<'all' | 'Faction' | 'SocialClass'>('all');
  showGlobalView = signal(false);

  readonly globalViewOverlays = computed<TernaryOverlayPoint[]>(() =>
    this.displayFactions.map(f => ({
      values: f.values,
      label: f.name,
      color: f.type === 'SocialClass' ? '#7c3aed' : '#1d4ed8',
      labelColor: f.type === 'SocialClass' ? '#e9d5ff' : '#bfdbfe',
    }))
  );

  readonly editForm = signal<FactionFormModel>(emptyForm());
  readonly editValues = signal<ValueVector>({ ...DEFAULT_VALUES });
  readonly f = form(this.editForm, schema => {
    required(schema.name, { message: 'Name is required' });
  });

  readonly ritualOptions: RitualPosition[] = ['Good', 'Neutral', 'Bad'];
  readonly knowledgeOptions: KnowledgePosition[] = ['Hidden', 'Controlled', 'Revealed'];
  readonly changeOptions: ChangePosition[] = ['Yes', 'No'];

  primaryValue    = primaryValue;
  secondaryValue  = secondaryValue;
  sacrificedValue = sacrificedValue;
  beliefConflicts = beliefConflicts;

  readonly detailCharacters = computed<Character[]>(() => {
    const faction = this.detailFaction();
    if (!faction) return [];
    return this.store.characters().filter(c => c.factionId === faction.id || c.socialClassId === faction.id);
  });

  readonly detailLeaders = computed<Character[]>(() =>
    this.detailCharacters().filter(c => c.characterType === 'FactionLeader')
  );

  readonly detailMembers = computed<Character[]>(() =>
    this.detailCharacters().filter(c => c.characterType !== 'FactionLeader')
  );

  readonly colonyStress = computed(() => this.store.colonyState()?.colonyStress ?? 0);

  charDriftScore(c: Character): number {
    return effectivePressure(c, this.colonyStress()) - c.conviction;
  }

  charBestFactionId(c: Character): string | null {
    const factions = this.store.factions().filter(f => f.active && f.type === 'Faction');
    const list = topCompatibleFactions(c, factions);
    return list[0]?.factionId ?? null;
  }

  charDriftClass(score: number): string {
    if (score >= 30) return 'drift-high';
    if (score >= 10) return 'drift-mid';
    if (score > 0)   return 'drift-low';
    return 'drift-none';
  }

  factionNameById(id: string): string {
    return this.store.factions().find(f => f.id === id)?.name ?? id;
  }

  readonly detailMostAligned = computed<Faction[]>(() => {
    const faction = this.detailFaction();
    if (!faction) return [];
    return mostAlignedFactions(faction, this.store.factions());
  });

  readonly detailMostOpposed = computed<Faction[]>(() => {
    const faction = this.detailFaction();
    if (!faction) return [];
    return mostOpposedFactions(faction, this.store.factions());
  });

  // Conflicts for the faction currently being edited.
  readonly editConflicts = computed<BeliefConflicts>(() => {
    const fm = this.editForm();
    return beliefConflicts(
      this.editValues(),
      (fm.ritual   as RitualPosition)    || undefined,
      (fm.knowledge as KnowledgePosition) || undefined,
      (fm.change    as ChangePosition)    || undefined,
    );
  });

  // Returns a human-readable hint for the edit modal, e.g. "Truth expects Revealed".
  conflictHint(): string {
    const primary = primaryValue(this.editValues());
    const key = primary.toLowerCase() as keyof typeof BELIEF_VALUE_ALIGNMENT;
    const { aligned, axis } = BELIEF_VALUE_ALIGNMENT[key];
    return `${primary} expects ${aligned} on ${axis.charAt(0).toUpperCase() + axis.slice(1)}`;
  }

  // Drag state — tracked by faction id.
  private dragSourceId: string | null = null;
  readonly dragOverId = signal<string | null>(null);

  get displayFactions(): Faction[] {
    const type = this.filterType();
    return this.store.factions().filter(f =>
      type === 'all' ? true : f.type === type
    );
  }

  onDragStart(id: string): void {
    this.dragSourceId = id;
  }

  onDragOver(event: DragEvent, id: string): void {
    event.preventDefault();
    if (id !== this.dragSourceId) this.dragOverId.set(id);
  }

  onDragLeave(id: string): void {
    if (this.dragOverId() === id) this.dragOverId.set(null);
  }

  onDrop(targetId: string): void {
    this.dragOverId.set(null);
    const srcId = this.dragSourceId;
    this.dragSourceId = null;
    if (!srcId || srcId === targetId) return;

    // Build new order by inserting src before target within the current visible list.
    const list = [...this.displayFactions];
    const srcIdx = list.findIndex(f => f.id === srcId);
    const tgtIdx = list.findIndex(f => f.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;
    list.splice(srcIdx, 1);
    list.splice(tgtIdx, 0, this.store.factions().find(f => f.id === srcId)!);
    this.store.reorderFactions(list.map(f => f.id));
  }

  onDragEnd(): void {
    this.dragSourceId = null;
    this.dragOverId.set(null);
  }

  openDetail(faction: Faction): void {
    this.detailFaction.set(faction);
  }

  closeDetail(): void {
    this.detailFaction.set(null);
  }

  openAdd(): void {
    this.editForm.set(emptyForm());
    this.editValues.set({ ...DEFAULT_VALUES });
    this.showModal.set(true);
  }

  openEdit(faction: Faction): void {
    this.editForm.set(toFormModel(faction));
    this.editValues.set({ ...faction.values });
    this.showModal.set(true);
  }

  close(): void {
    this.showModal.set(false);
  }

  save(): void {
    const fm = this.editForm();
    if (!fm.name.trim()) return;
    this.store.saveFaction(fromFormModel(fm, this.editValues()));
    this.showModal.set(false);
    setTimeout(() => this.store.loadRelationships(undefined), 400);
  }

  delete(id: string): void {
    if (confirm('Delete this faction?')) {
      this.store.deleteFaction(id);
    }
  }

  toggleActive(faction: Faction): void {
    this.store.saveFaction({ ...faction, active: !faction.active });
    setTimeout(() => this.store.loadRelationships(undefined), 400);
  }

  typeLabel(t: string): string {
    return t === 'Faction' ? 'Faction' : 'Social Class';
  }

  exportCsv(): void {
    const header = [
      'Id', 'Name', 'Type', 'Active', 'SortOrder',
      'Represents', 'CoreTenet', 'CertainOf', 'RightAbout',
      'AfraidOf', 'WrongAbout', 'SingleSentence',
      'Ritual', 'Knowledge', 'Change',
      'Truth', 'Stability', 'Agency',
      'Notes'
    ];
    const rows = this.store.factions().map(f => [
      f.id, f.name, f.type, f.active ? 'true' : 'false', f.sortOrder,
      f.represents, f.coreTenet, f.certainOf, f.rightAbout,
      f.wrongAbout, f.afraidOf, f.singleSentence,
      f.ritual ?? '', f.knowledge ?? '', f.change ?? '',
      f.values.truth.toFixed(4), f.values.stability.toFixed(4), f.values.agency.toFixed(4),
      f.notes ?? ''
    ]);
    downloadCsv([header, ...rows], 'factions.csv');
  }
}
