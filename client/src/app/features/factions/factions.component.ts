import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormField, form, required } from '@angular/forms/signals';
import { AppStore } from '../../store/app.store';
import { FactionInfluenceService } from '../../core/services/faction-influence.service';
import {
  Faction, GroupType, BeliefPosition,
  ValueVector, primaryValue, secondaryValue, sacrificedValue,
  beliefConflicts, BeliefConflicts, beliefPositionLabel,
  FactionGoal, GoalStatus, GoalPriority, GoalVisibility,
  GOAL_STATUS_OPTIONS, GOAL_PRIORITY_OPTIONS, GOAL_VISIBILITY_OPTIONS,
} from '../../core/models/types';
import { TernaryPlotComponent, TernaryOverlayPoint } from '../../shared/ternary-plot/ternary-plot.component';
import { downloadCsv, parseCsv, csvHeaderMap } from '../../core/utils/csv-export';
import { oneOf, clampedInt, sanitizeValueVector } from '../../core/utils/validation';

interface AddFactionFormModel {
  name: string;
  represents: string;
  type: string;
}

const DEFAULT_VALUES: ValueVector = { a: 1/3, b: 1/3, c: 1/3 };

const emptyAddForm = (): AddFactionFormModel => ({ name: '', represents: '', type: 'Faction' });


@Component({
  selector: 'app-factions',
  standalone: true,
  imports: [FormField, TernaryPlotComponent],
  templateUrl: './factions.component.html',
  styleUrl: './factions.component.scss'
})
export class FactionsComponent {
  store     = inject(AppStore);
  influence = inject(FactionInfluenceService);
  router    = inject(Router);

  showModal      = signal(false);
  filterType     = signal<'all' | 'Faction' | 'SocialClass'>('all');
  showGlobalView = signal(false);

  readonly globalViewOverlays = computed<TernaryOverlayPoint[]>(() =>
    this.displayFactions.map(f => ({
      values: f.values,
      label: f.name,
      color: f.type === 'SocialClass' ? '#7c3aed' : '#1d4ed8',
      labelColor: f.type === 'SocialClass' ? '#e9d5ff' : '#bfdbfe',
    }))
  );

  // ── Add faction form ────────────────────────────────────────────────────────

  readonly editForm = signal<AddFactionFormModel>(emptyAddForm());
  readonly f = form(this.editForm, schema => {
    required(schema.name, { message: 'Name is required' });
  });

  openAdd(): void {
    this.editForm.set(emptyAddForm());
    this.showModal.set(true);
  }

  close(): void { this.showModal.set(false); }

  save(): void {
    const fm = this.editForm();
    if (!fm.name.trim()) return;
    this.store.saveFaction({
      id: '',
      name: fm.name.trim(),
      represents: fm.represents,
      type: fm.type as GroupType,
      coreTenet: '', certainOf: '', rightAbout: '', afraidOf: '', wrongAbout: '',
      values: { ...DEFAULT_VALUES },
      active: true, sortOrder: 0, momentum: 0, baseLegitimacy: 50, powerModifier: 0,
    });
    this.showModal.set(false);
  }

  // ── Card display helpers ────────────────────────────────────────────────────

  primaryValue    = primaryValue;
  secondaryValue  = secondaryValue;
  sacrificedValue = sacrificedValue;

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

  typeLabel(t: string): string {
    return t === 'Faction' ? 'Faction' : 'Social Class';
  }

  factionMemberCount(f: Faction): number {
    return this.store.viewCharacters().filter(c => c.factionId === f.id || c.socialClassId === f.id).length;
  }

  factionTotalInfluence(f: Faction): number {
    const members = this.store.viewCharacters().filter(c => c.state === 'Alive' && (c.factionId === f.id || c.socialClassId === f.id));
    const assets  = this.store.viewAssets().filter(a => a.controllingFactionId === f.id);
    return this.influence.calculateTotalInfluence(f, members, this.store.formulas(), assets);
  }

  factionEffectivePower(f: Faction): number {
    const members = this.store.viewCharacters().filter(c => c.state === 'Alive' && (c.factionId === f.id || c.socialClassId === f.id));
    const assets  = this.store.viewAssets().filter(a => a.controllingFactionId === f.id);
    return this.influence.calculateEffectivePower(f, members, this.store.formulas(), assets);
  }

  factionGoalCount(f: Faction): number {
    return this.store.factionGoals().filter(g => g.factionId === f.id && g.status !== 'Accomplished' && g.status !== 'Failed').length;
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  openDetail(faction: Faction): void {
    this.router.navigate(['/factions', faction.id]);
  }

  // ── Drag-to-reorder ─────────────────────────────────────────────────────────

  private dragSourceId: string | null = null;
  readonly dragOverId = signal<string | null>(null);

  get displayFactions(): Faction[] {
    const type = this.filterType();
    return this.store.viewFactions().filter(f => type === 'all' || f.type === type);
  }

  onDragStart(id: string): void { this.dragSourceId = id; }

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

  // ── CSV import / export ─────────────────────────────────────────────────────

  importCsv(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(reader.result as string);
      if (rows.length < 2) return;
      const h = csvHeaderMap(rows[0]);
      const get = (row: string[], col: string) => row[h.get(col) ?? -1] ?? '';

      if (h.has('factionid')) {
        // Goals file
        const factionIds = new Set(this.store.factions().map(f => f.id));
        for (const row of rows.slice(1)) {
          const factionId = get(row, 'factionid');
          if (!factionIds.has(factionId)) continue;
          const goal: FactionGoal = {
            id:               get(row, 'id') || crypto.randomUUID(),
            campaignId:       this.store.activeCampaign()!.id,
            factionId,
            title:            get(row, 'title'),
            description:      get(row, 'description') || undefined,
            status:           oneOf(get(row, 'status'),   GOAL_STATUS_OPTIONS.map(o => o.value)   as GoalStatus[])   ?? 'Plotting',
            priority:         oneOf(get(row, 'priority'), GOAL_PRIORITY_OPTIONS.map(o => o.value) as GoalPriority[]) ?? 'Major',
            visibility:       oneOf(get(row, 'visibility'), GOAL_VISIBILITY_OPTIONS.map(o => o.value) as GoalVisibility[]) ?? 'Open',
            targetEntityType: oneOf(get(row, 'targetentitytype'), ['Character', 'Asset', 'Faction'] as const) || undefined,
            targetEntityId:   get(row, 'targetentityid') || undefined,
            targetState:      get(row, 'targetstate') || undefined,
            targetProperty:   get(row, 'targetproperty') || undefined,
            targetOperator:   oneOf(get(row, 'targetoperator'), ['gte', 'lte', 'eq'] as const) || undefined,
            targetThreshold:  parseFloat(get(row, 'targetthreshold')) || undefined,
          };
          this.store.saveFactionGoal(goal);
        }
      } else {
        // Factions file
        const vl = this.store.valueLabels();
        const bl = this.store.beliefAxisLabels();
        // Try fixed key first (old exports), then display name (new exports)
        const getCol = (row: string[], fixed: string, display: string) =>
          get(row, fixed) || get(row, display.toLowerCase());
        for (const row of rows.slice(1)) {
          const faction: Faction = {
            id:             get(row, 'id'),
            name:           get(row, 'name'),
            type:           oneOf(get(row, 'type'), ['Faction', 'SocialClass'] as const) ?? 'Faction',
            active:         get(row, 'active') !== 'false',
            sortOrder:      clampedInt(get(row, 'sortorder'), 0, 99999, 0),
            represents:     get(row, 'represents'),
            coreTenet:      get(row, 'coretenet'),
            focus:          get(row, 'focus')      || undefined,
            certainOf:      get(row, 'certainof'),
            rightAbout:     get(row, 'rightabout'),
            afraidOf:       get(row, 'afraidof'),
            wrongAbout:     get(row, 'wrongabout'),
            response:       get(row, 'response')   || undefined,
            summary:        get(row, 'summary')    || undefined,
            motto:          get(row, 'motto')      || undefined,
            origin:         get(row, 'origin')     || undefined,
            foundedAs:      get(row, 'foundedas')  || undefined,
            became:         get(row, 'became')     || undefined,
            publicFace:     get(row, 'publicface') || undefined,
            selfImage:      get(row, 'selfimage')  || undefined,
            history:        get(row, 'history')    || undefined,
            beliefc: oneOf(getCol(row, 'beliefc', bl.c.axisName), ['positive', 'neutral', 'negative'] as const),
            beliefa: oneOf(getCol(row, 'beliefa', bl.a.axisName), ['positive', 'neutral', 'negative'] as const),
            beliefb: oneOf(getCol(row, 'beliefb', bl.b.axisName), ['positive', 'negative']             as const),
            values: sanitizeValueVector(
              parseFloat(getCol(row, 'valuea', vl.a)),
              parseFloat(getCol(row, 'valueb', vl.b)),
              parseFloat(getCol(row, 'valuec', vl.c)),
            ),
            notes:          get(row, 'notes')         || undefined,
            primaryColor:   get(row, 'primarycolor')  || undefined,
            secondaryColor: get(row, 'secondarycolor') || undefined,
            momentum:        parseInt(get(row, 'momentum'))        || 0,
            baseLegitimacy:  parseInt(get(row, 'baselegitimacy'))  || 50,
            powerModifier:   parseInt(get(row, 'powermodifier'))   || 0,
          };
          this.store.saveFaction(faction);
        }
      }
      (event.target as HTMLInputElement).value = '';
    };
    reader.readAsText(file);
  }

  exportCsv(): void {
    const factions = this.store.factions();
    const vl = this.store.valueLabels();
    const bl = this.store.beliefAxisLabels();
    const factionHeader = [
      'Id', 'Name', 'Type', 'Active', 'SortOrder',
      'Represents', 'CoreTenet', 'Focus', 'CertainOf', 'RightAbout',
      'AfraidOf', 'WrongAbout', 'Response', 'Summary', 'Motto',
      'Origin', 'FoundedAs', 'Became', 'PublicFace', 'SelfImage', 'History',
      bl.c.axisName, bl.a.axisName, bl.b.axisName,
      vl.a, vl.b, vl.c,
      'Momentum', 'BaseLegitimacy', 'PowerModifier',
      'Notes', 'PrimaryColor', 'SecondaryColor'
    ];
    const factionRows = factions.map(f => [
      f.id, f.name, f.type, f.active ? 'true' : 'false', f.sortOrder,
      f.represents, f.coreTenet, f.focus ?? '', f.certainOf, f.rightAbout,
      f.afraidOf, f.wrongAbout, f.response ?? '', f.summary ?? '', f.motto ?? '',
      f.origin ?? '', f.foundedAs ?? '', f.became ?? '', f.publicFace ?? '', f.selfImage ?? '', f.history ?? '',
      f.beliefc ?? '', f.beliefa ?? '', f.beliefb ?? '',
      f.values.a.toFixed(4), f.values.b.toFixed(4), f.values.c.toFixed(4),
      f.momentum, f.baseLegitimacy, f.powerModifier,
      f.notes ?? '', f.primaryColor ?? '', f.secondaryColor ?? ''
    ]);
    downloadCsv([factionHeader, ...factionRows], 'factions.csv');

    const factionNameById = new Map(factions.map(f => [f.id, f.name]));
    const characterNameById = new Map(this.store.characters().map(c => [c.id, c.name]));
    const assetNameById = new Map(this.store.assets().map(a => [a.id, a.name]));
    const resolveEntityName = (type: string | undefined, id: string | undefined): string => {
      if (!id) return '';
      if (type === 'Faction')   return factionNameById.get(id)   ?? id;
      if (type === 'Character') return characterNameById.get(id) ?? id;
      if (type === 'Asset')     return assetNameById.get(id)     ?? id;
      return id;
    };
    const goals = this.store.factionGoals();
    if (goals.length > 0) {
      const goalHeader = [
        'Id', 'FactionId', 'FactionName', 'Title', 'Description',
        'Status', 'Priority', 'Visibility',
        'TargetEntityType', 'TargetEntityId', 'TargetEntityName', 'TargetState',
        'TargetProperty', 'TargetOperator', 'TargetThreshold'
      ];
      const goalRows = goals.map(g => [
        g.id, g.factionId, factionNameById.get(g.factionId) ?? '',
        g.title, g.description ?? '',
        g.status, g.priority, g.visibility,
        g.targetEntityType ?? '', g.targetEntityId ?? '',
        resolveEntityName(g.targetEntityType, g.targetEntityId),
        g.targetState ?? '',
        g.targetProperty ?? '', g.targetOperator ?? '', g.targetThreshold ?? ''
      ]);
      downloadCsv([goalHeader, ...goalRows], 'faction-goals.csv');
    }
  }
}
