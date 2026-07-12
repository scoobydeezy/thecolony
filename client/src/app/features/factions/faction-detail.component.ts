import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe, NgClass } from '@angular/common';
import { FormField, form, required } from '@angular/forms/signals';
import { AppStore } from '../../store/app.store';
import { ApiService } from '../../core/services/api.service';
import { FactionInfluenceService } from '../../core/services/faction-influence.service';
import {
  Faction, BannerShape, Asset, AssetType, AssetStatus, Character, CharacterState, GroupType, BeliefPosition,
  ValueVector, primaryValue, secondaryValue, sacrificedValue,
  beliefConflicts, BeliefConflicts,
  mostAlignedFactions, mostOpposedFactions, effectivePressure, topCompatibleFactions,
  beliefAxisOptions, beliefPositionLabel,
  FactionGoal, GoalStatus, GoalConditionType, GoalPriority, GoalVisibility, GoalTargetEntityType, GoalTargetOperator,
  GOAL_STATUS_OPTIONS, GOAL_PRIORITY_OPTIONS, GOAL_VISIBILITY_OPTIONS,
  CHARACTER_TARGET_STATES, ASSET_TARGET_STATES, FACTION_TARGET_PROPS,
} from '../../core/models/types';
import { TernaryPlotComponent } from '../../shared/ternary-plot/ternary-plot.component';
import { PriorityIconComponent } from '../../shared/priority-icon/priority-icon.component';
import { getAncestryImagePath } from '../../core/utils/ancestry-images';

type EditingCard = 'header' | 'psychology' | 'beliefs' | 'perception' | 'influence' | 'history' | null;

interface GoalFormModel {
  id: string;
  factionId: string;
  title: string;
  status: GoalStatus;
  conditionType: GoalConditionType;
  priority: GoalPriority;
  visibility: GoalVisibility;
  targetEntityType: GoalTargetEntityType | '';
  targetEntityId: string;
  targetState: string;
  targetOwnerFactionId: string;
  championId: string;
  targetProperty: string;
  targetOperator: GoalTargetOperator | '';
  targetThreshold: string;
}

const emptyGoalForm = (factionId = ''): GoalFormModel => ({
  id: '', factionId, title: '',
  status: 'Plotting', conditionType: 'Achieve', priority: 'Major', visibility: 'Known',
  targetEntityType: '', targetEntityId: '',
  targetState: '', targetOwnerFactionId: '', championId: '', targetProperty: '', targetOperator: '', targetThreshold: '',
});

const toGoalFormModel = (g: FactionGoal): GoalFormModel => ({
  id: g.id, factionId: g.factionId, title: g.title,
  status: g.status,
  conditionType: g.conditionType ?? 'Achieve',
  priority: g.priority, visibility: g.visibility,
  targetEntityType: g.targetEntityType ?? '',
  targetEntityId: g.targetEntityId ?? '',
  targetState: g.targetState ?? '',
  targetOwnerFactionId: g.targetOwnerFactionId ?? '',
  championId: g.championId ?? '',
  targetProperty: g.targetProperty ?? '',
  targetOperator: g.targetOperator ?? '',
  targetThreshold: g.targetThreshold != null ? g.targetThreshold.toString() : '',
});

const fromGoalFormModel = (fm: GoalFormModel): FactionGoal => ({
  id: fm.id, campaignId: '', factionId: fm.factionId,
  title: fm.title.trim(),
  status: fm.status, conditionType: fm.conditionType, priority: fm.priority, visibility: fm.visibility,
  targetEntityType: fm.targetEntityType || undefined,
  targetEntityId: fm.targetEntityId || undefined,
  targetState: (fm.targetEntityType === 'Character' || (fm.targetEntityType === 'Asset' && !fm.targetOwnerFactionId)) && fm.targetState ? fm.targetState : undefined,
  targetOwnerFactionId: fm.targetEntityType === 'Asset' && fm.targetOwnerFactionId ? fm.targetOwnerFactionId : undefined,
  championId: fm.championId || undefined,
  targetProperty: fm.targetEntityType === 'Faction' && fm.targetProperty ? fm.targetProperty : undefined,
  targetOperator: fm.targetEntityType === 'Faction' && fm.targetOperator ? fm.targetOperator as GoalTargetOperator : undefined,
  targetThreshold: fm.targetEntityType === 'Faction' && fm.targetThreshold ? parseInt(fm.targetThreshold, 10) : undefined,
});

interface FactionFormModel {
  id: string;
  name: string;
  represents: string;
  type: string;
  summary: string;
  motto: string;
  coreTenet: string;
  focus: string;
  certainOf: string;
  rightAbout: string;
  afraidOf: string;
  wrongAbout: string;
  response: string;
  origin: string;
  foundedAs: string;
  became: string;
  publicFace: string;
  selfImage: string;
  history: string;
  primaryColor: string;
  secondaryColor: string;
  bannerShape: BannerShape | '';
  beliefc: string;
  beliefa: string;
  beliefb: string;
  active: string;
  notes: string;
  sortOrder: number;
  momentum: string;
  baseLegitimacy: string;
  powerModifier: string;
}

const DEFAULT_VALUES: ValueVector = { a: 1/3, b: 1/3, c: 1/3 };

const toFormModel = (f: Faction): FactionFormModel => ({
  id: f.id,
  name: f.name,
  represents: f.represents,
  type: f.type,
  coreTenet: f.coreTenet,
  focus: f.focus ?? '',
  certainOf: f.certainOf,
  rightAbout: f.rightAbout,
  afraidOf: f.afraidOf,
  wrongAbout: f.wrongAbout,
  response: f.response ?? '',
  summary: f.summary ?? '',
  motto: f.motto ?? '',
  origin: f.origin ?? '',
  foundedAs: f.foundedAs ?? '',
  became: f.became ?? '',
  publicFace: f.publicFace ?? '',
  selfImage: f.selfImage ?? '',
  history: f.history ?? '',
  primaryColor: f.primaryColor ?? '',
  secondaryColor: f.secondaryColor ?? '',
  bannerShape: f.bannerShape ?? '',
  beliefc: f.beliefc ?? '',
  beliefa: f.beliefa ?? '',
  beliefb: f.beliefb ?? '',
  active: f.active ? 'true' : 'false',
  notes: f.notes ?? '',
  sortOrder: f.sortOrder,
  momentum: f.momentum.toString(),
  baseLegitimacy: f.baseLegitimacy.toString(),
  powerModifier: f.powerModifier.toString(),
});

const fromFormModel = (fm: FactionFormModel, values: ValueVector, existing: Faction): Faction => ({
  id: fm.id,
  name: fm.name,
  represents: fm.represents,
  type: fm.type as GroupType,
  coreTenet: fm.coreTenet,
  focus: fm.focus || undefined,
  certainOf: fm.certainOf,
  rightAbout: fm.rightAbout,
  afraidOf: fm.afraidOf,
  wrongAbout: fm.wrongAbout,
  response: fm.response || undefined,
  summary: fm.summary || undefined,
  motto: fm.motto || undefined,
  origin: fm.origin || undefined,
  foundedAs: fm.foundedAs || undefined,
  became: fm.became || undefined,
  publicFace: fm.publicFace || undefined,
  selfImage: fm.selfImage || undefined,
  history: fm.history || undefined,
  glyphPath: existing.glyphPath,
  iconPath: existing.iconPath,
  primaryColor: fm.primaryColor || undefined,
  secondaryColor: fm.secondaryColor || undefined,
  beliefc: (fm.beliefc as BeliefPosition) || undefined,
  beliefa: (fm.beliefa as BeliefPosition) || undefined,
  beliefb: (fm.beliefb as BeliefPosition) || undefined,
  values,
  active: fm.active === 'true',
  notes: fm.notes || undefined,
  sortOrder: fm.sortOrder,
  momentum: fm.momentum !== '' ? +fm.momentum : 0,
  baseLegitimacy: fm.baseLegitimacy !== '' ? +fm.baseLegitimacy : 50,
  powerModifier: fm.powerModifier !== '' ? +fm.powerModifier : 0,
  additionalMemberCount: existing.additionalMemberCount ?? 0,
});

@Component({
  selector: 'app-faction-detail',
  standalone: true,
  imports: [RouterLink, FormField, TernaryPlotComponent, PriorityIconComponent, DecimalPipe, NgClass],
  templateUrl: './faction-detail.component.html',
  styleUrl: './faction-detail.component.scss'
})
export class FactionDetailComponent implements OnInit, OnDestroy {
  store     = inject(AppStore);
  api       = inject(ApiService);
  influence = inject(FactionInfluenceService);
  route     = inject(ActivatedRoute);
  router    = inject(Router);

  private routeSub?: Subscription;

  // ── Per-card edit state ───────────────────────────────────────────────────

  editingCard = signal<EditingCard>(null);

  isEditing(card: EditingCard): boolean { return this.editingCard() === card; }

  openCard(card: EditingCard): void {
    this.editForm.set(toFormModel(this.faction()));
    this.editValues.set({ ...this.faction().values });
    this.editingCard.set(card);
  }

  closeCard(): void { this.editingCard.set(null); }

  setColor(field: 'primaryColor' | 'secondaryColor', value: string): void {
    this.editForm.update(fm => ({ ...fm, [field]: value }));
  }

  setBannerShape(shape: BannerShape | ''): void {
    this.editForm.update(fm => ({ ...fm, bannerShape: shape }));
  }

  saveCard(card: EditingCard): void {
    const fm = this.editForm();
    const current = this.faction();
    let updated: Faction;

    switch (card) {
      case 'header':
        updated = { ...current, name: fm.name, represents: fm.represents, type: fm.type as GroupType, active: fm.active === 'true', motto: fm.motto || undefined, summary: fm.summary || undefined, primaryColor: fm.primaryColor || undefined, secondaryColor: fm.secondaryColor || undefined, bannerShape: (fm.bannerShape as BannerShape) || undefined };
        break;
      case 'psychology':
        updated = { ...current, coreTenet: fm.coreTenet, focus: fm.focus || undefined, certainOf: fm.certainOf, rightAbout: fm.rightAbout, afraidOf: fm.afraidOf, wrongAbout: fm.wrongAbout };
        break;
      case 'beliefs':
        updated = { ...current, values: this.editValues(), beliefc: (fm.beliefc as BeliefPosition) || undefined, beliefa: (fm.beliefa as BeliefPosition) || undefined, beliefb: (fm.beliefb as BeliefPosition) || undefined, response: fm.response || undefined };
        break;
      case 'perception':
        updated = { ...current, publicFace: fm.publicFace || undefined, selfImage: fm.selfImage || undefined, momentum: fm.momentum !== '' ? +fm.momentum : 0, baseLegitimacy: fm.baseLegitimacy !== '' ? +fm.baseLegitimacy : 50, powerModifier: fm.powerModifier !== '' ? +fm.powerModifier : 0 };
        break;
      case 'history':
        updated = { ...current, foundedAs: fm.foundedAs || undefined, became: fm.became || undefined, origin: fm.origin || undefined, notes: fm.notes || undefined, history: fm.history || undefined };
        break;
      default:
        return;
    }

    this.store.saveFaction(updated);
    this.editingCard.set(null);
    setTimeout(() => this.store.loadRelationships(undefined), 400);
  }

  // ── Banner shape options ─────────────────────────────────────────────────

  readonly bannerShapeOptions: { value: BannerShape; label: string }[] = [
    { value: 'centered-triangle', label: 'Center'  },
    { value: 'left-triangle',     label: 'Left'    },
    { value: 'right-triangle',    label: 'Right'   },
    { value: 'inverted-triangle', label: 'Notch'   },
    { value: 'rectangle',         label: 'Flat'    },
    { value: 'semi-circle',       label: 'Round'   },
    { value: 'pennant',           label: 'Pennant' },
  ];

  // ── Faction state ─────────────────────────────────────────────────────────

  private factionId = signal<string>('');
  private iconBust  = signal<string | null>(null);
  private glyphBust = signal<string | null>(null);

  // Derived from viewFactions so snapshot projections (momentum, legitimacy, etc.) are always applied.
  // iconBust/glyphBust hold cache-busted URLs locally without polluting the store.
  readonly faction = computed<Faction>(() => {
    const id = this.factionId();
    const base = this.store.viewFactions().find(f => f.id === id) ?? {
      id: '', name: '', represents: '', type: 'Faction' as GroupType,
      coreTenet: '', certainOf: '', rightAbout: '', afraidOf: '', wrongAbout: '',
      values: { ...DEFAULT_VALUES },
      active: true, sortOrder: 0, momentum: 0, baseLegitimacy: 50, powerModifier: 0, additionalMemberCount: 0,
    };
    const icon  = this.iconBust();
    const glyph = this.glyphBust();
    return {
      ...base,
      ...(icon  != null ? { iconPath:  icon  } : {}),
      ...(glyph != null ? { glyphPath: glyph } : {}),
    };
  });

  readonly editForm   = signal<FactionFormModel>(toFormModel(this.faction()));
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

  axisName(axis: 'a' | 'b' | 'c'): string {
    return this.store.beliefAxisLabels()[axis].axisName;
  }

  readonly factionConflicts = computed<BeliefConflicts>(() => {
    const f = this.faction();
    return beliefConflicts(f.values, f.beliefc, f.beliefa, f.beliefb, this.store.beliefAxisLabels());
  });

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

  conflictHint(): string {
    const primary = primaryValue(this.editValues());
    const axisKey = primary.toLowerCase() as 'a' | 'b' | 'c';
    const bl = this.store.beliefAxisLabels();
    const cfg = bl[axisKey];
    const alignedPos: BeliefPosition = cfg.positiveAligns ? 'positive' : 'negative';
    const alignedLabel = cfg[alignedPos];
    const vl = this.store.valueLabels();
    return `High ${vl[axisKey]} expects ${alignedLabel} on ${cfg.axisName}`;
  }

  // ── Members ───────────────────────────────────────────────────────────────

  readonly allCharacters = computed<Character[]>(() => {
    const f = this.faction();
    return this.store.viewCharacters().filter(c => c.factionId === f.id || c.socialClassId === f.id);
  });

  readonly activeCharacters = computed<Character[]>(() =>
    this.allCharacters().filter(c => c.state === 'Alive')
  );

  readonly inactiveCharacters = computed<Character[]>(() =>
    this.allCharacters().filter(c => c.state !== 'Alive').sort((a, b) => a.name.localeCompare(b.name))
  );

  readonly leaders = computed<Character[]>(() =>
    this.activeCharacters()
      .filter(c => c.characterType === 'FactionLeader')
      .sort((a, b) => b.influence - a.influence)
  );

  readonly members = computed<Character[]>(() =>
    this.activeCharacters()
      .filter(c => c.characterType !== 'FactionLeader')
      .sort((a, b) => b.influence - a.influence)
  );

  adjustAdditionalMembers(delta: number): void {
    const current = this.faction();
    const next = Math.max(0, (current.additionalMemberCount ?? 0) + delta);
    this.store.saveFaction({ ...current, additionalMemberCount: next });
  }

  // ── Influence ─────────────────────────────────────────────────────────────

  readonly charInfluence = computed(() =>
    this.influence.calculateCharacterInfluence(this.activeCharacters(), undefined, this.faction().additionalMemberCount ?? 0)
  );

  readonly assetInfluenceScore = computed(() =>
    this.influence.calculateAssetInfluenceScore(this.assets(), this.faction()?.id ?? '', this.store.formulas())
  );

  readonly assetLegitimacyScore = computed(() =>
    this.influence.calculateAssetLegitimacyScore(this.assets(), this.faction()?.id ?? '', this.store.formulas())
  );

  readonly totalInfluence = computed(() =>
    this.influence.calculateTotalInfluence(this.faction(), this.activeCharacters(), this.store.formulas(), this.assets())
  );

  readonly effectivePower = computed(() =>
    this.influence.calculateEffectivePower(this.faction(), this.activeCharacters(), this.store.formulas(), this.assets())
  );

  readonly colonyStress   = computed(() => this.store.viewColonyStress());
  readonly isBaselineView = computed(() => this.store.activeSnapshot() === null);

  formatMomentum(m: number): string { return m > 0 ? `+${m}` : `${m}`; }

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

  momentumFlip(m: number): boolean { return m < 0; }

  // ── Aligned / Opposed ─────────────────────────────────────────────────────

  readonly mostAligned = computed<Faction[]>(() =>
    mostAlignedFactions(this.faction(), this.store.factions())
  );

  readonly mostOpposed = computed<Faction[]>(() =>
    mostOpposedFactions(this.faction(), this.store.factions())
  );

  // ── Goals ─────────────────────────────────────────────────────────────────

  private readonly PRIORITY_ORDER: Record<GoalPriority, number> = { Critical: 0, Major: 1, Minor: 2 };

  readonly goals = computed<FactionGoal[]>(() =>
    this.store.viewGoals()
      .filter(g => g.factionId === this.faction().id)
      .sort((a, b) => this.PRIORITY_ORDER[a.priority] - this.PRIORITY_ORDER[b.priority])
  );

  readonly activeGoals   = computed<FactionGoal[]>(() =>
    this.goals().filter(g => g.status !== 'Accomplished' && g.status !== 'Failed')
  );

  readonly resolvedGoals = computed<FactionGoal[]>(() =>
    this.goals().filter(g => g.status === 'Accomplished' || g.status === 'Failed')
  );

  readonly priorityOptions  = GOAL_PRIORITY_OPTIONS;
  readonly visibilityOptions = GOAL_VISIBILITY_OPTIONS;
  readonly conditionTypeOptions: { value: GoalConditionType; label: string }[] = [
    { value: 'Achieve',  label: 'Achieve'  },
    { value: 'Maintain', label: 'Maintain' },
  ];

  readonly showGoalModal = signal(false);
  readonly goalModel     = signal<GoalFormModel>(emptyGoalForm());
  readonly goalForm      = form(this.goalModel);

  readonly goalStatusOptions = computed<{ value: GoalStatus; label: string }[]>(() => {
    if (this.goalModel().conditionType === 'Maintain') {
      return [
        { value: 'Plotting',    label: 'Plotting' },
        { value: 'Progressing', label: 'Maintaining' },
        { value: 'Stalled',     label: 'At Risk' },
        { value: 'Failed',      label: 'Failed' },
      ];
    }
    return GOAL_STATUS_OPTIONS;
  });

  private readonly MAINTAIN_STATUS_LABELS: Partial<Record<GoalStatus, string>> = {
    Progressing: 'Maintaining',
    Stalled:     'At Risk',
  };

  goalStatusLabel(g: FactionGoal): string {
    if (g.conditionType === 'Maintain') {
      return this.MAINTAIN_STATUS_LABELS[g.status] ?? g.status;
    }
    return g.status;
  }

  goalStatusIcon(g: FactionGoal): string {
    const label = this.goalStatusLabel(g);
    switch (label) {
      case 'Plotting':     return 'fa-compass-drafting';
      case 'Progressing':  return 'fa-ellipsis';
      case 'Maintaining':  return 'fa-ellipsis';
      case 'Stalled':      return 'fa-road-barrier';
      case 'At Risk':      return 'fa-triangle-exclamation';
      default:             return 'fa-ellipsis';
    }
  }

  goalStatusClass(g: FactionGoal): string {
    const label = this.goalStatusLabel(g);
    switch (label) {
      case 'Plotting':    return 'status-plotting';
      case 'Progressing': return 'status-progressing';
      case 'Maintaining': return 'status-progressing';
      case 'Stalled':     return 'status-stalled';
      case 'At Risk':     return 'status-stalled';
      default:            return '';
    }
  }

  readonly goalTargetStateOptions = computed<string[]>(() => {
    const t = this.goalModel().targetEntityType;
    if (t === 'Character') return [...CHARACTER_TARGET_STATES];
    if (t === 'Asset')     return [...ASSET_TARGET_STATES];
    return [];
  });

  readonly goalTargetEntityOptions = computed<{ id: string; name: string }[]>(() => {
    const t = this.goalModel().targetEntityType;
    if (t === 'Character') return this.store.characters().map(c => ({ id: c.id, name: c.name }));
    if (t === 'Asset')     return this.store.assets().map(a => ({ id: a.id, name: a.name }));
    if (t === 'Faction')   return this.store.factions().filter(f => f.active).map(f => ({ id: f.id, name: f.name }));
    return [];
  });

  readonly factionTargetProps = [...FACTION_TARGET_PROPS];

  openAddGoal(): void {
    this.goalModel.set(emptyGoalForm(this.faction().id));
    this.showGoalModal.set(true);
  }

  openEditGoal(goal: FactionGoal): void {
    this.goalModel.set(toGoalFormModel(goal));
    this.showGoalModal.set(true);
  }

  closeGoalModal(): void { this.showGoalModal.set(false); }

  saveGoal(): void {
    const fm = this.goalModel();
    if (!fm.title.trim() || !fm.factionId) return;
    this.store.saveFactionGoal(fromGoalFormModel(fm));
    this.showGoalModal.set(false);
  }

  deleteGoal(id: string): void {
    if (!confirm('Delete this goal?')) return;
    this.store.deleteFactionGoal(id);
  }

  resetTargetFields(): void {
    this.goalModel.update(f => ({
      ...f, targetEntityId: '', targetState: '', targetOwnerFactionId: '',
      targetProperty: '', targetOperator: '', targetThreshold: '',
    }));
  }

  championFor(g: FactionGoal): Character | undefined {
    return g.championId
      ? this.store.viewCharacters().find(c => c.id === g.championId)
      : undefined;
  }

  isChampionInactive(c: Character): boolean {
    return c.state === 'Dead' || c.state === 'Forgotten';
  }

  championPortrait(c: Character): string {
    return c.portraitPath ?? getAncestryImagePath(c.ancestry, c.gender);
  }

  onAssetConditionModeChange(mode: 'status' | 'ownership'): void {
    if (mode === 'ownership') {
      this.goalModel.update(f => ({ ...f, targetState: '', targetOwnerFactionId: f.factionId }));
    } else {
      this.goalModel.update(f => ({ ...f, targetOwnerFactionId: '', targetState: '' }));
    }
  }

  goalTargetLabel(g: FactionGoal): string {
    if (!g.targetEntityType || !g.targetEntityId) return '';
    const entityName = g.targetEntityType === 'Character'
      ? (this.store.characters().find(c => c.id === g.targetEntityId)?.name ?? g.targetEntityId)
      : g.targetEntityType === 'Asset'
        ? (this.store.assets().find(a => a.id === g.targetEntityId)?.name ?? g.targetEntityId)
        : this.factionNameById(g.targetEntityId);
    if (g.targetEntityType === 'Faction' && g.targetProperty && g.targetOperator && g.targetThreshold != null) {
      const opLabel = g.targetOperator === 'gte' ? '≥' : g.targetOperator === 'lte' ? '≤' : '=';
      return `${entityName} ${g.targetProperty} ${opLabel} ${g.targetThreshold}`;
    }
    if (g.targetEntityType === 'Asset' && g.targetOwnerFactionId) {
      const ownerName = this.factionNameById(g.targetOwnerFactionId);
      return `${entityName} controlled by ${ownerName}`;
    }
    if (g.targetState) return `${entityName} → ${g.targetState}`;
    return entityName;
  }

  // ── Assets ────────────────────────────────────────────────────────────────

  readonly assets = computed<Asset[]>(() => {
    const key = (name: string) => name.replace(/^the\s+/i, '').toLowerCase();
    return this.store.viewAssets()
      .filter(a => a.controllingFactionId === this.faction().id)
      .sort((a, b) => {
        if (a.keystone !== b.keystone) return a.keystone ? -1 : 1;
        return key(a.name).localeCompare(key(b.name));
      });
  });

  // ── Character helpers ─────────────────────────────────────────────────────

  charDriftScore(c: Character): number {
    return effectivePressure(c, this.colonyStress()) - c.conviction;
  }

  charBestFactionId(c: Character): string | null {
    const factions = this.store.viewFactions().filter(f => f.active && f.type === 'Faction');
    return topCompatibleFactions(c, factions, this.store.formulas().beliefDerivationThreshold)[0]?.factionId ?? null;
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
    Alive: '', Dead: 'fa-solid fa-skull',
    Missing: 'fa-solid fa-circle-question', Forgotten: 'fa-solid fa-hourglass-start',
  };

  stateIconClass(state: CharacterState): string {
    const icon = this.stateIconMap[state];
    return icon ? `state-icon ${icon} state-icon--${state.toLowerCase()}` : '';
  }

  typeLabel(t: string): string {
    return t === 'Faction' ? 'Faction' : 'Social Class';
  }

  // ── Status / badge helpers ────────────────────────────────────────────────

  statusClass(status: GoalStatus): string {
    const map: Record<GoalStatus, string> = {
      Plotting: 'status-plotting', Progressing: 'status-progressing',
      Stalled: 'status-stalled', Accomplished: 'status-accomplished', Failed: 'status-failed',
    };
    return map[status];
  }

  priorityClass(priority: GoalPriority): string {
    const map: Record<GoalPriority, string> = {
      Critical: 'priority-critical', Major: 'priority-major', Minor: 'priority-minor',
    };
    return map[priority];
  }

  visibilityClass(visibility: GoalVisibility): string {
    const map: Record<GoalVisibility, string> = {
      Open: 'visibility-open', Known: 'visibility-known', Secret: 'visibility-secret',
    };
    return map[visibility];
  }

  assetStatusClass(status: AssetStatus): string {
    const map: Record<AssetStatus, string> = {
      Stable: 'status-stable', Contested: 'status-contested', Damaged: 'status-damaged',
      Destroyed: 'status-destroyed',
    };
    return map[status];
  }

  assetTypeIcon(type: AssetType): string {
    const map: Record<AssetType, string> = {
      Infrastructure: 'fa-duotone fa-landmark',
      Artifact:       'fa-duotone fa-ring',
      Resource:       'fa-duotone fa-treasure-chest',
      Intelligence:   'fa-duotone fa-scroll-old',
    };
    return map[type];
  }

  // ── Image upload ──────────────────────────────────────────────────────────

  uploadGlyph(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.api.uploadFactionGlyph(this.faction().id, file).subscribe(res => {
      this.glyphBust.set(`${res.path}?v=${Date.now()}`);
      this.store.saveFaction({ ...this.faction(), glyphPath: res.path });
    });
    (event.target as HTMLInputElement).value = '';
  }

  uploadIcon(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.api.uploadFactionIcon(this.faction().id, file).subscribe(res => {
      this.iconBust.set(`${res.path}?v=${Date.now()}`);
      this.store.saveFaction({ ...this.faction(), iconPath: res.path });
    });
    (event.target as HTMLInputElement).value = '';
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (!id) { this.router.navigate(['/factions']); return; }
      const found = this.store.factions().find(f => f.id === id);
      if (found) {
        this.factionId.set(id);
        this.iconBust.set(null);
        this.glyphBust.set(null);
        this.closeCard();
      } else {
        this.router.navigate(['/factions']);
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  delete(): void {
    if (!confirm('Delete this faction? This cannot be undone.')) return;
    this.store.deleteFaction(this.faction().id);
    this.router.navigate(['/factions']);
  }
}
