import { InstabilityBadgeComponent } from '../../shared/instability-badge/instability-badge.component';
import { topCompatibleFactions, mostAlignedFactions, mostOpposedFactions, DEFAULT_RULES } from '../../core/services/scoring.service';
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
  effectivePressure,
  beliefAxisOptions, beliefPositionLabel,
  FactionGoal, GoalPriority, TERMINAL_GOAL_STATUSES,
} from '../../core/models/types';
import { TernaryPlotComponent } from '../../shared/ternary-plot/ternary-plot.component';
import { GoalCardComponent } from '../goals/goal-card.component';

type EditingCard = 'header' | 'psychology' | 'beliefs' | 'perception' | 'influence' | 'history' | null;

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
  momentumTier: string;
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
  momentumTier: String(f.momentumTier ?? 0),
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
  momentum: existing.momentum,   // legacy raw value: archived, never edited (M3)
  momentumTier: fm.momentumTier !== '' ? +fm.momentumTier : 0,
  powerModifier: fm.powerModifier !== '' ? +fm.powerModifier : 0,
  factionSize: existing.factionSize ?? 0,
});

@Component({
  selector: 'app-faction-detail',
  standalone: true,
  imports: [InstabilityBadgeComponent, RouterLink, FormField, TernaryPlotComponent, DecimalPipe, NgClass, GoalCardComponent],
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
    const source = this.baselineFaction() ?? this.faction();
    this.editForm.set(toFormModel(source));
    this.editValues.set({ ...source.values });
    this.editingCard.set(card);
  }

  closeCard(): void { this.editingCard.set(null); }

  setColor(field: 'primaryColor' | 'secondaryColor', value: string): void {
    this.editForm.update(fm => ({ ...fm, [field]: value }));
  }

  setBannerShape(shape: BannerShape | ''): void {
    this.editForm.update(fm => ({ ...fm, bannerShape: shape }));
  }

  // D9: every save starts from the baseline record. faction() is the snapshot-projected view and also
  // carries local cache-busted image URLs; neither may leak into the baseline.
  private baselineFaction(): Faction | undefined {
    return this.store.factions().find(f => f.id === this.factionId());
  }

  saveCard(card: EditingCard): void {
    const fm = this.editForm();
    const current = this.baselineFaction();
    if (!current) return;
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
        updated = { ...current, publicFace: fm.publicFace || undefined, selfImage: fm.selfImage || undefined, momentumTier: fm.momentumTier !== '' ? +fm.momentumTier : 0 };   // M2: Power Modifier retired; M3: raw Momentum archived; §18.7: Legitimacy retired
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
      active: true, sortOrder: 0, momentum: 0, powerModifier: 0, factionSize: 0,
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

  readonly leaders = computed<Character[]>(() => {
    const leaderId = this.faction().leaderId;
    if (!leaderId) return [];
    return this.activeCharacters().filter(c => c.id === leaderId);
  });

  readonly members = computed<Character[]>(() => {
    const leaderId = this.faction().leaderId;
    return this.activeCharacters()
      .filter(c => c.id !== leaderId)
      .sort((a, b) => b.influence - a.influence);
  });

  setLeader(id: string | null): void {
    const base = this.baselineFaction();
    if (base) this.store.saveFaction({ ...base, leaderId: id ?? undefined });
  }

  adjustFactionSize(delta: number): void {
    const current = this.baselineFaction();
    if (!current) return;
    const next = Math.max(0, (current.factionSize ?? 0) + delta);
    this.store.saveFaction({ ...current, factionSize: next });
  }

  // ── Influence ─────────────────────────────────────────────────────────────

  // D4: one breakdown feeds every Power-related number on this page.
  readonly power = computed(() =>
    this.influence.breakdown(this.faction(), this.store.viewCharacters(), this.store.viewAssets(), this.store.formulas())
  );
  readonly effectivePower       = computed(() => this.power().power);
  /** §18.8: the People channel in words, e.g. "leader +5 · 40 members +2". */
  readonly peopleDetail = computed(() => {
    const p = this.power().people;
    return `${p.leaderBonus ? `leader +${p.leaderBonus}` : 'no capable leader'} · ${p.size} members +${p.sizePoints}`;
  });
  /** The Assets counted toward a channel, e.g. "Docks 4★, River Exchange 5★". */
  assetDetail(which: 'holdings' | 'mandate'): string {
    const c = this.power()[which];
    return c.assets.length ? c.assets.map(x => `${x.asset.name} ${x.stars}★${x.asset.status === 'Destroyed' ? ' (Destroyed)' : ''}`).join(', ') : 'none';
  }

  readonly colonyStress   = computed(() => this.store.viewColonyStress());
  readonly isBaselineView = computed(() => this.store.activeSnapshot() === null);

  // ── Momentum (M3): a tier from −2 to +2 ──────────────────────────────────
  readonly momentumSteps = [-2, -1, 0, 1, 2];
  readonly momentumTier = computed(() => this.faction().momentumTier ?? 0);
  /** Signals recorded at the viewed snapshot, resolved at the next Opening. */
  readonly pendingSignals = computed(() =>
    (this.store.activeSnapshot()?.pendingMomentumSignals ?? []).filter(s => s.factionId === this.factionId()));
  readonly baselineRawMomentum = computed(() => this.store.factions().find(f => f.id === this.factionId())?.momentum ?? 0);

  formatMomentum(m: number): string { return m > 0 ? `+${m}` : `${m}`; }

  /** −2 double down, −1 down, 0 level, +1 up, +2 double up. */
  momentumIcon(m: number): string {
    if (m >= 2)  return 'fa-angles-up';
    if (m === 1) return 'fa-angle-up';
    if (m === 0) return 'fa-arrow-right-long';
    if (m === -1) return 'fa-angle-down';
    return 'fa-angles-down';
  }

  momentumClass(m: number): string {
    if (m === 0) return 'momentum-neutral';
    return `momentum-${m > 0 ? 'pos' : 'neg'}-${Math.abs(m) >= 2 ? 'high' : 'mid'}`;
  }

  // ── Aligned / Opposed ─────────────────────────────────────────────────────

  readonly mostAligned = computed<Faction[]>(() =>
    mostAlignedFactions(this.faction(), this.store.factions(), 3, this.store.rules() ?? DEFAULT_RULES)
  );

  readonly mostOpposed = computed<Faction[]>(() =>
    mostOpposedFactions(this.faction(), this.store.factions(), 3, this.store.rules() ?? DEFAULT_RULES)
  );

  // ── Goals (a summary, like the Assets; managed on the Goals page) ───────

  private readonly PRIORITY_ORDER: Record<GoalPriority, number> = { Critical: 0, Major: 1, Minor: 2 };

  readonly goals = computed<FactionGoal[]>(() =>
    this.store.viewGoals()
      .filter(g => g.factionId === this.faction().id)
      .sort((a, b) => this.PRIORITY_ORDER[a.priority] - this.PRIORITY_ORDER[b.priority])
  );
  readonly activeGoals   = computed<FactionGoal[]>(() => this.goals().filter(g => !TERMINAL_GOAL_STATUSES.includes(g.status)));
  readonly resolvedGoals = computed<FactionGoal[]>(() => this.goals().filter(g => TERMINAL_GOAL_STATUSES.includes(g.status)));
  /** "2 Planning · 1 Progressing · 1 Ready": the section header's summary. */
  readonly goalStat = computed(() => {
    const a = this.activeGoals(), ga = this.store.viewGoalAssessments();
    const parts = [[a.filter(g => g.conditionType === 'Achieve' && g.status === 'Plotting').length, 'Planning'],
                   [a.filter(g => g.conditionType === 'Achieve' && g.status === 'Progressing').length, 'Progressing'],
                   [a.filter(g => ga.get(g.id)?.ready).length, 'Ready'],
                   [a.filter(g => g.conditionType === 'Maintain').length, 'Maintain']] as const;
    return parts.filter(([n]) => n > 0).map(([n, l]) => `${n} ${l}`).join(' · ');
  });

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
    return effectivePressure(c, this.colonyStress(), this.store.formulas().stressPressureCoefficient) - c.conviction;
  }

  charBestFactionId(c: Character): string | null {
    const factions = this.store.viewFactions().filter(f => f.active && f.type === 'Faction');
    return topCompatibleFactions(c, factions, this.store.formulas().beliefDerivationThreshold, this.store.beliefAxisLabels(), this.store.rules() ?? DEFAULT_RULES)[0]?.factionId ?? null;
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
      const base = this.baselineFaction();
      if (base) this.store.saveFaction({ ...base, glyphPath: res.path });
    });
    (event.target as HTMLInputElement).value = '';
  }

  uploadIcon(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.api.uploadFactionIcon(this.faction().id, file).subscribe(res => {
      this.iconBust.set(`${res.path}?v=${Date.now()}`);
      const base = this.baselineFaction();
      if (base) this.store.saveFaction({ ...base, iconPath: res.path });
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
        this.store.setNarrativeFocus({ type: 'Faction', id: found.id, name: found.name });
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
