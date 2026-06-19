import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';
import { FormField, form, required } from '@angular/forms/signals';
import { AppStore } from '../../store/app.store';
import { FactionInfluenceService } from '../../core/services/faction-influence.service';
import {
  Faction, Character, CharacterState, GroupType, BeliefPosition,
  ValueVector, primaryValue, secondaryValue, sacrificedValue,
  beliefConflicts, BeliefConflicts,
  mostAlignedFactions, mostOpposedFactions, effectivePressure, topCompatibleFactions,
  beliefAxisOptions, beliefPositionLabel
} from '../../core/models/types';
import { TernaryPlotComponent, TernaryOverlayPoint } from '../../shared/ternary-plot/ternary-plot.component';
import { downloadCsv, parseCsv, csvHeaderMap } from '../../core/utils/csv-export';
import { oneOf, clampedInt, sanitizeValueVector } from '../../core/utils/validation';


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
  beliefc: string;
  beliefa: string;
  beliefb: string;
  active: string;
  notes: string;
  sortOrder: number;
  baseInfluence: string;
  momentum: string;
  legitimacy: string;
}

const DEFAULT_VALUES: ValueVector = { a: 1/3, b: 1/3, c: 1/3 };

const emptyForm = (): FactionFormModel => ({
  id: '', name: '', represents: '', type: 'Faction',
  coreTenet: '', certainOf: '', rightAbout: '', afraidOf: '',
  wrongAbout: '', singleSentence: '',
  beliefc: '', beliefa: '', beliefb: '',
  active: 'true', notes: '', sortOrder: 0,
  baseInfluence: '50', momentum: '0', legitimacy: '50'
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
  beliefc: f.beliefc ?? '',
  beliefa: f.beliefa ?? '',
  beliefb: f.beliefb ?? '',
  active: f.active ? 'true' : 'false',
  notes: f.notes ?? '',
  sortOrder: f.sortOrder,
  baseInfluence: f.baseInfluence.toString(),
  momentum: f.momentum.toString(),
  legitimacy: f.legitimacy.toString()
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
  beliefc: (fm.beliefc as BeliefPosition) || undefined,
  beliefa: (fm.beliefa as BeliefPosition) || undefined,
  beliefb: (fm.beliefb as BeliefPosition) || undefined,
  values,
  active: fm.active === 'true',
  notes: fm.notes || undefined,
  sortOrder: fm.sortOrder,
  baseInfluence: fm.baseInfluence !== '' ? +fm.baseInfluence : 50,
  momentum: fm.momentum !== '' ? +fm.momentum : 0,
  legitimacy: fm.legitimacy !== '' ? +fm.legitimacy : 50
});

@Component({
  selector: 'app-factions',
  standalone: true,
  imports: [FormField, TernaryPlotComponent, DecimalPipe, NgClass],
  templateUrl: './factions.component.html',
  styleUrl: './factions.component.scss'
})
export class FactionsComponent {
  store    = inject(AppStore);
  influence = inject(FactionInfluenceService);

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

  primaryValue    = primaryValue;
  secondaryValue  = secondaryValue;
  sacrificedValue = sacrificedValue;

  readonly beliefcOptions = computed(() => beliefAxisOptions(this.store.beliefAxisLabels().c));
  readonly beliefaOptions = computed(() => beliefAxisOptions(this.store.beliefAxisLabels().a));
  readonly beliefbOptions = computed(() => beliefAxisOptions(this.store.beliefAxisLabels().b));

  valueLabel(v: string): string {
    const vl = this.store.valueLabels();
    const key = v.toLowerCase() as keyof typeof vl;
    return (key === 'a' || key === 'b' || key === 'c') ? vl[key] : v;
  }

  beliefLabel(axis: 'a' | 'b' | 'c', pos: BeliefPosition): string {
    return beliefPositionLabel(pos, this.store.beliefAxisLabels()[axis]);
  }

  beliefClass(axis: 'a' | 'b' | 'c', pos: BeliefPosition): string {
    const cfg = this.store.beliefAxisLabels()[axis];
    if (pos === 'positive') return cfg.positiveAligns ? 'belief-statusquo' : 'belief-dissent';
    if (pos === 'negative') return cfg.positiveAligns ? 'belief-dissent' : 'belief-statusquo';
    return 'belief-neutral';
  }

  beliefConflictsComputed(values: ValueVector, beliefc: BeliefPosition | undefined, beliefa: BeliefPosition | undefined, beliefb: BeliefPosition | undefined): BeliefConflicts {
    return beliefConflicts(values, beliefc, beliefa, beliefb, this.store.beliefAxisLabels());
  }

  axisName(axis: 'a' | 'b' | 'c'): string {
    return this.store.beliefAxisLabels()[axis].axisName;
  }

  // Full roster for display (includes Dead/Missing/Forgotten — historical record)
  readonly detailCharacters = computed<Character[]>(() => {
    const faction = this.detailFaction();
    if (!faction) return [];
    return this.store.viewCharacters().filter(c => c.factionId === faction.id || c.socialClassId === faction.id);
  });

  // Alive members only — used for all influence/power/peer calculations
  readonly detailActiveCharacters = computed<Character[]>(() =>
    this.detailCharacters().filter(c => c.state === 'Alive')
  );

  // Non-Alive members — shown in "Former Members" section, excluded from calculations
  readonly detailInactiveCharacters = computed<Character[]>(() =>
    this.detailCharacters().filter(c => c.state !== 'Alive').sort((a, b) => a.name.localeCompare(b.name))
  );

  readonly detailLeaders = computed<Character[]>(() =>
    this.detailActiveCharacters()
      .filter(c => c.characterType === 'FactionLeader')
      .sort((a, b) => b.influence - a.influence)
  );

  readonly detailMembers = computed<Character[]>(() =>
    this.detailActiveCharacters()
      .filter(c => c.characterType !== 'FactionLeader')
      .sort((a, b) => b.influence - a.influence)
  );

  readonly detailCharInfluence = computed(() =>
    this.influence.calculateCharacterInfluence(this.detailActiveCharacters())
  );

  readonly detailNormalizedMomentum = computed(() => {
    const f = this.detailFaction();
    return f ? this.influence.calculateNormalizedMomentum(f.momentum) : 50;
  });

  readonly detailTotalInfluence = computed(() => {
    const f = this.detailFaction();
    return f ? this.influence.calculateTotalInfluence(f, this.detailActiveCharacters(), this.store.formulas()) : 0;
  });

  readonly detailEffectivePower = computed(() => {
    const f = this.detailFaction();
    return f ? this.influence.calculateEffectivePower(f, this.detailActiveCharacters(), this.store.formulas()) : 0;
  });

  formatMomentum(m: number): string {
    return m > 0 ? `+${m}` : `${m}`;
  }

  momentumIcon(m: number): string {
    const abs = Math.abs(m);
    if (abs >= 50) return 'fa-arrow-trend-up';
    if (abs >= 20) return 'fa-arrow-trend-up';
    return 'fa-arrow-right-long';
  }

  momentumClass(m: number): string {
    const abs = Math.abs(m);
    const dir = m > 0 ? 'pos' : m < 0 ? 'neg' : 'neutral';
    if (dir === 'neutral') return 'momentum-neutral';
    const level = abs >= 50 ? 'high' : abs >= 20 ? 'mid' : 'low';
    return `momentum-${dir}-${level}`;
  }

  momentumFlip(m: number): boolean {
    return m < 0;
  }

  readonly colonyStress = computed(() => this.store.viewColonyStress());

  charDriftScore(c: Character): number {
    return effectivePressure(c, this.colonyStress()) - c.conviction;
  }

  charBestFactionId(c: Character): string | null {
    const factions = this.store.viewFactions().filter(f => f.active && f.type === 'Faction');
    const list = topCompatibleFactions(c, factions, this.store.formulas().beliefDerivationThreshold);
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

  private readonly stateIconMap: Record<CharacterState, string> = {
    Alive:     '',
    Dead:      'fa-solid fa-skull',
    Missing:   'fa-solid fa-circle-question',
    Forgotten: 'fa-solid fa-hourglass-start',
  };

  stateIconClass(state: CharacterState): string {
    const icon = this.stateIconMap[state];
    return icon ? `state-icon ${icon} state-icon--${state.toLowerCase()}` : '';
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
      (fm.beliefc as BeliefPosition) || undefined,
      (fm.beliefa as BeliefPosition) || undefined,
      (fm.beliefb as BeliefPosition) || undefined,
      this.store.beliefAxisLabels(),
    );
  });

  // Returns a human-readable hint for the edit modal, e.g. "Stability expects No on Change".
  conflictHint(): string {
    const primary = primaryValue(this.editValues());
    const axisKey = primary.toLowerCase() as 'a' | 'b' | 'c';
    const bl = this.store.beliefAxisLabels();
    const cfg = bl[axisKey];
    const alignedPos: BeliefPosition = cfg.positiveAligns ? 'positive' : 'negative';
    const alignedLabel = cfg[alignedPos];
    const vl = this.store.valueLabels();
    const valueLabel = vl[axisKey];
    return `${valueLabel} expects ${alignedLabel} on ${cfg.axisName}`;
  }

  // Drag state — tracked by faction id.
  private dragSourceId: string | null = null;
  readonly dragOverId = signal<string | null>(null);

  get displayFactions(): Faction[] {
    const type = this.filterType();
    return this.store.viewFactions().filter(f =>
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

  factionMemberCount(f: Faction): number {
    return this.store.viewCharacters().filter(c => c.factionId === f.id || c.socialClassId === f.id).length;
  }

  factionTotalInfluence(f: Faction): number {
    const members = this.store.viewCharacters().filter(c => c.state === 'Alive' && (c.factionId === f.id || c.socialClassId === f.id));
    return this.influence.calculateTotalInfluence(f, members, this.store.formulas());
  }

  factionEffectivePower(f: Faction): number {
    const members = this.store.viewCharacters().filter(c => c.state === 'Alive' && (c.factionId === f.id || c.socialClassId === f.id));
    return this.influence.calculateEffectivePower(f, members, this.store.formulas());
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

      for (const row of rows.slice(1)) {
        const faction: Faction = {
          id:             get(row, 'id'),
          name:           get(row, 'name'),
          type:           oneOf(get(row, 'type'), ['Faction', 'SocialClass'] as const) ?? 'Faction',
          active:         get(row, 'active') !== 'false',
          sortOrder:      clampedInt(get(row, 'sortorder'), 0, 99999, 0),
          represents:     get(row, 'represents'),
          coreTenet:      get(row, 'coretenet'),
          certainOf:      get(row, 'certainof'),
          rightAbout:     get(row, 'rightabout'),
          afraidOf:       get(row, 'afraidof'),
          wrongAbout:     get(row, 'wrongabout'),
          singleSentence: get(row, 'singlesentence'),
          beliefc: oneOf(get(row, 'beliefc'), ['positive', 'neutral', 'negative'] as const),
          beliefa: oneOf(get(row, 'beliefa'), ['positive', 'neutral', 'negative'] as const),
          beliefb: oneOf(get(row, 'beliefb'), ['positive', 'negative']             as const),
          values: sanitizeValueVector(
            parseFloat(get(row, 'valuea')),
            parseFloat(get(row, 'valueb')),
            parseFloat(get(row, 'valuec')),
          ),
          notes: get(row, 'notes') || undefined,
          baseInfluence: parseInt(get(row, 'baseinfluence')) || 50,
          momentum: parseInt(get(row, 'momentum')) || 0,
          legitimacy: parseInt(get(row, 'legitimacy')) || 50,
        };
        this.store.saveFaction(faction);
      }
      (event.target as HTMLInputElement).value = '';
    };
    reader.readAsText(file);
  }

  exportCsv(): void {
    const header = [
      'Id', 'Name', 'Type', 'Active', 'SortOrder',
      'Represents', 'CoreTenet', 'CertainOf', 'RightAbout',
      'AfraidOf', 'WrongAbout', 'SingleSentence',
      'BeliefC', 'BeliefA', 'BeliefB',
      'ValueA', 'ValueB', 'ValueC',
      'BaseInfluence', 'Momentum', 'Legitimacy',
      'Notes'
    ];
    const rows = this.store.factions().map(f => [
      f.id, f.name, f.type, f.active ? 'true' : 'false', f.sortOrder,
      f.represents, f.coreTenet, f.certainOf, f.rightAbout,
      f.afraidOf, f.wrongAbout, f.singleSentence,
      f.beliefc ?? '', f.beliefa ?? '', f.beliefb ?? '',
      f.values.a.toFixed(4), f.values.b.toFixed(4), f.values.c.toFixed(4),
      f.baseInfluence, f.momentum, f.legitimacy,
      f.notes ?? ''
    ]);
    downloadCsv([header, ...rows], 'factions.csv');
  }
}
