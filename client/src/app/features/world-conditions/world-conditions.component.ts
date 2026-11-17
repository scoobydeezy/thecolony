import { Component, computed, inject, signal } from '@angular/core';
import { AppStore } from '../../store/app.store';
import { ASSET_STATUS_OPTIONS, CHARACTER_STATE_OPTIONS, LOCATION_STATE_OPTIONS, WorldCondition, locationStateLabel } from '../../core/models/types';
import { ConditionRequirement, ConditionStatus, ConditionVariesBy, GOAL_STAGE_OPTIONS, VariesByKind, variesByOf, conditionWorldAt, evaluateConditions, requirementsOf } from '../../core/sim/conditions';
import { CONDITION_CSV_HEADER, conditionToCsvRow, conditionFromCsvRow } from '../../core/utils/condition-csv';
import { downloadCsv, parseCsv, csvHeaderMap } from '../../core/utils/csv-export';
import { ToastService, ImportTally } from '../../core/services/toast.service';

const blank = (): WorldCondition => ({ id: '', campaignId: '', title: '', rule: '', ruleOtherwise: '', variesByJson: null, activeAtStart: true, requirementsJson: '[]', stressContribution: 0, sortOrder: 0 });

/** A fresh requirement of a kind, with empty choices for the GM to fill in. */
function newRequirement(kind: ConditionRequirement['kind']): ConditionRequirement {
  switch (kind) {
    case 'assetController':  return { kind, assetId: '', factionId: '' };
    case 'assetStatus':      return { kind, assetId: '', statuses: [] };
    case 'characterState':   return { kind, characterId: '', states: [] };
    case 'characterFaction': return { kind, characterId: '', factionId: '' };
    case 'leaderCapable':    return { kind, factionId: '', capable: true };
    case 'locationState':    return { kind, locationId: '', states: [] };
    case 'condition':        return { kind, conditionId: '', inForce: true };
    case 'goalStage':        return { kind, goalId: '', stages: [] };
  }
}
// The editor's row: [Entity Type] [Entity] [Verb] [Object]. Each (type, verb) is one stored requirement kind (conditions.ts).
type EntityType = 'asset' | 'character' | 'faction' | 'location' | 'goal' | 'condition';
type VbType = 'asset' | 'character' | 'location' | 'goal';
interface Verb { key: string; label: string; kind: ConditionRequirement['kind']; flag?: boolean }   // flag: capable / inForce
const ENTITY_TYPES: { value: EntityType; label: string }[] = [
  { value: 'asset', label: 'Asset' }, { value: 'character', label: 'Character' }, { value: 'faction', label: 'Faction' },
  { value: 'location', label: 'Location' }, { value: 'goal', label: 'Goal' }, { value: 'condition', label: 'World Condition' },
];
const VERBS: Record<EntityType, Verb[]> = {
  asset: [{ key: 'assetController', label: 'Controlled by', kind: 'assetController' }, { key: 'assetStatus', label: 'Status is', kind: 'assetStatus' }],
  character: [{ key: 'characterState', label: 'State is', kind: 'characterState' }, { key: 'characterFaction', label: 'Belongs to', kind: 'characterFaction' }],
  faction: [{ key: 'leader:yes', label: 'Has a capable leader', kind: 'leaderCapable', flag: true }, { key: 'leader:no', label: 'Is leaderless', kind: 'leaderCapable', flag: false }],
  location: [{ key: 'locationState', label: 'State is', kind: 'locationState' }],
  goal: [{ key: 'goalStage', label: 'Stage is', kind: 'goalStage' }],
  condition: [{ key: 'condition:yes', label: 'Is in force', kind: 'condition', flag: true }, { key: 'condition:no', label: 'Is not in force', kind: 'condition', flag: false }],
};
const TYPE_OF: Record<ConditionRequirement['kind'], EntityType> = {
  assetController: 'asset', assetStatus: 'asset', characterState: 'character', characterFaction: 'character',
  leaderCapable: 'faction', locationState: 'location', condition: 'condition', goalStage: 'goal',
};
const entityIdOf = (r: ConditionRequirement): string =>
  'assetId' in r ? r.assetId : 'characterId' in r ? r.characterId : 'locationId' in r ? r.locationId : 'conditionId' in r ? r.conditionId
  : 'goalId' in r ? r.goalId : r.factionId;
const verbKeyOf = (r: ConditionRequirement): string =>
  r.kind === 'leaderCapable' ? (r.capable ? 'leader:yes' : 'leader:no') : r.kind === 'condition' ? (r.inForce ? 'condition:yes' : 'condition:no') : r.kind;
/** A requirement of `verb`, on the entity `id` (kept when only the verb changes). */
function requirementFor(verb: Verb, id = ''): ConditionRequirement {
  const r = newRequirement(verb.kind) as ConditionRequirement & Record<string, unknown>;
  if (verb.kind === 'leaderCapable') return { ...r, factionId: id, capable: verb.flag ?? true } as ConditionRequirement;
  if (verb.kind === 'condition') return { ...r, conditionId: id, inForce: verb.flag ?? true } as ConditionRequirement;
  const field = TYPE_OF[verb.kind] === 'asset' ? 'assetId' : TYPE_OF[verb.kind] === 'character' ? 'characterId'
    : TYPE_OF[verb.kind] === 'goal' ? 'goalId' : 'locationId';
  return { ...r, [field]: id } as ConditionRequirement;
}

/** A requirement is complete once its subject (and, for state lists, at least one state) is chosen. */
function complete(r: ConditionRequirement): boolean {
  switch (r.kind) {
    case 'assetController':  return !!r.assetId;
    case 'assetStatus':      return !!r.assetId && r.statuses.length > 0;
    case 'characterState':   return !!r.characterId && r.states.length > 0;
    case 'characterFaction': return !!r.characterId;
    case 'leaderCapable':    return !!r.factionId;
    case 'locationState':    return !!r.locationId && r.states.length > 0;
    case 'condition':        return !!r.conditionId;
    case 'goalStage':        return !!r.goalId && r.stages.length > 0;
  }
}

/**
 * §18.6/§18.9/§18.10 The World Conditions page (World section; moved from the Sessions panel). World Conditions: the persistent table rules of the campaign, with whether each is in force at the viewed
 * point in history, why, and what it adds to Colony Stress. A condition holds when it is established (from the start, or
 * by an Event) and every requirement holds; requirements read recorded state only (never a Stress-dependent value).
 */
@Component({
  selector: 'app-world-conditions',
  standalone: true,
  templateUrl: './world-conditions.component.html',
  styleUrl: './world-conditions.component.scss',
})
export class WorldConditionsComponent {
  store = inject(AppStore);
  private readonly toast = inject(ToastService);
  readonly show = signal<'all' | 'on' | 'off'>('all');
  readonly editing = signal<WorldCondition | null>(null);
  readonly reqs = signal<ConditionRequirement[]>([]);
  readonly entityTypes = ENTITY_TYPES;
  readonly verbs = VERBS;
  readonly typeOf = (r: ConditionRequirement) => TYPE_OF[r.kind];
  readonly entityIdOf = entityIdOf;
  readonly variesByOf = variesByOf;
  readonly verbKeyOf = verbKeyOf;
  readonly assetStatuses = ASSET_STATUS_OPTIONS;
  readonly characterStates = CHARACTER_STATE_OPTIONS;
  readonly locationStates = LOCATION_STATE_OPTIONS;
  readonly goalStages = GOAL_STAGE_OPTIONS;

  /** At the viewed snapshot, or the latest session when viewing the present. */
  private readonly snap = computed(() => this.store.activeSnapshot() ?? this.store.colonySnapshots().at(-1) ?? null);
  readonly statuses = computed(() => {
    const world = conditionWorldAt(this.snap(), { assets: this.store.assets(), characters: this.store.characters(),
                                                  factions: this.store.factions(), locations: this.store.locations(), goals: this.store.factionGoals() });
    const map = evaluateConditions(this.store.worldConditions(), world, {
      asset: id => this.store.assets().find(a => a.id === id)?.name ?? id,
      faction: id => this.store.factions().find(f => f.id === id)?.name ?? id,
      character: id => this.store.characters().find(c => c.id === id)?.name ?? id,
      location: id => this.store.locations().find(l => l.id === id)?.name ?? id,
      goal: id => this.store.factionGoals().find(g => g.id === id)?.title ?? id,
    });
    return [...map.values()].sort((a, b) => Number(b.inForce) - Number(a.inForce) || a.condition.sortOrder - b.condition.sortOrder
      || a.condition.title.localeCompare(b.condition.title));
  });
  readonly inForceCount = computed(() => this.statuses().filter(s => s.inForce).length);
  readonly shown = computed(() => this.statuses().filter(s => this.show() === 'all' || (this.show() === 'on') === s.inForce));

  /** Cross-references: which conditions require each condition. */
  readonly links = computed(() => {
    const m = new Map<string, { requiredBy: string[] }>();
    const at = (id: string) => m.get(id) ?? (m.set(id, { requiredBy: [] }), m.get(id)!);
    for (const c of this.store.worldConditions())
      for (const r of requirementsOf(c)) if (r.kind === 'condition') at(r.conditionId).requiredBy.push(c.title);
    return m;
  });
  readonly stressFromConditions = computed(() => this.statuses().reduce((t, s) => t + s.stress, 0));
  readonly when = computed(() => { const s = this.snap(); return s ? `after Session ${s.sessionNumber}` : 'at the start'; });
  readonly otherConditions = computed(() => this.store.worldConditions().filter(c => c.id !== this.editing()?.id));

  // ── the card's caption: what the condition depends on, in short words (each requirement marked holds / does not) ──
  caption(s: ConditionStatus): { parts: { text: string; holds: boolean }[]; title: string } {
    const vb = variesByOf(s.condition);
    if (vb) {
      const entity = this.vbEntities(vb.subject.kind).find(e => e.id === vb.subject.id)?.name ?? 'a missing entity';
      const prop = this.vbProperties[this.vbTypeOf(vb.subject.kind)].find(p => p.kind === vb.subject.kind)?.label ?? '';
      return { parts: [{ text: `Varies by ${entity} · ${prop}`, holds: true }], title: s.reason };
    }
    const reqs = requirementsOf(s.condition);
    const l = this.links().get(s.condition.id);
    const parts = reqs.map((r, i) => ({ text: this.requirementLabel(r), holds: s.holds[i] ?? false }));
    if (!s.condition.activeAtStart) parts.unshift({ text: 'Established by an Event', holds: s.established });
    else if (!reqs.length) parts.push({ text: 'Always, unless an Event ends it', holds: s.established });
    const extra = [l?.requiredBy.length ? `Required by ${l.requiredBy.join(', ')}` : ''];
    return { parts, title: [s.reason, ...extra].filter(Boolean).join('\n') };
  }
  /** "Damaged or Destroyed"; a list of every state but one reads "not Destroyed". */
  private states(chosen: string[], all: string[], label: (s: string) => string = s => s): string {
    const missing = all.filter(s => !chosen.includes(s));
    return all.length > 2 && missing.length === 1 ? `not ${label(missing[0])}` : chosen.map(label).join(' or ');
  }
  requirementLabel(r: ConditionRequirement): string {
    const asset = (id: string) => this.store.assets().find(a => a.id === id)?.name ?? 'a missing Asset';
    const fac = (id: string) => this.store.factions().find(f => f.id === id)?.name ?? id;
    const chr = (id: string) => this.store.characters().find(c => c.id === id)?.name ?? 'a missing character';
    const loc = (id: string) => this.store.locations().find(l => l.id === id)?.name ?? 'a missing Location';
    switch (r.kind) {
      case 'assetController': return `${asset(r.assetId)} held by ${r.factionId ? fac(r.factionId) : 'no one'}`;
      case 'assetStatus': return `${asset(r.assetId)} → ${this.states(r.statuses, ASSET_STATUS_OPTIONS.map(o => o.value))}`;
      case 'characterState': return `${chr(r.characterId)} → ${this.states(r.states, CHARACTER_STATE_OPTIONS.map(o => o.value))}`;
      case 'characterFaction': return `${chr(r.characterId)} in ${r.factionId ? fac(r.factionId) : 'no faction'}`;
      case 'leaderCapable': return `${fac(r.factionId)} ${r.capable ? 'has a capable leader' : 'is leaderless'}`;
      case 'locationState': return `${loc(r.locationId)} → ${this.states(r.states, LOCATION_STATE_OPTIONS.map(o => o.value), locationStateLabel)}`;
      case 'condition': return `“${this.store.worldConditions().find(c => c.id === r.conditionId)?.title ?? 'a removed condition'}” ${r.inForce ? 'in force' : 'not in force'}`;
      case 'goalStage': return `${this.store.factionGoals().find(g => g.id === r.goalId)?.title ?? 'a missing goal'} → ${this.states(r.stages, GOAL_STAGE_OPTIONS.map(o => o.value), st => GOAL_STAGE_OPTIONS.find(o => o.value === st)?.label ?? st)}`;
    }
  }

  add(): void { this.editing.set(blank()); this.reqs.set([]); this.vb.set(null); this.mode.set('requirements'); }
  edit(c: WorldCondition): void {
    this.editing.set({ ...c }); this.reqs.set(requirementsOf(c).map(r => ({ ...r })));
    const vb = variesByOf(c);
    this.vb.set(vb ? { subject: { ...vb.subject }, rows: this.rowsFor(vb.subject, vb.rows) } : null);
    this.mode.set(vb ? 'varies' : 'requirements');
  }

  // ── "varies by": one entity's property, a row per state (2026-10-26) ──
  readonly mode = signal<'requirements' | 'varies'>('requirements');
  readonly vb = signal<ConditionVariesBy | null>(null);
  readonly vbTypes: { value: VbType; label: string }[] = [
    { value: 'asset', label: 'Asset' }, { value: 'character', label: 'Character' }, { value: 'location', label: 'Location' },
    { value: 'goal', label: 'Goal' }];
  readonly vbProperties: Record<VbType, { kind: VariesByKind; label: string }[]> = {
    asset: [{ kind: 'assetStatus', label: 'Status' }, { kind: 'assetController', label: 'Controller' }],
    character: [{ kind: 'characterState', label: 'State' }, { kind: 'characterFaction', label: 'Faction' }],
    location: [{ kind: 'locationState', label: 'State' }],
    goal: [{ kind: 'goalStage', label: 'Stage' }],
  };
  vbTypeOf(kind: VariesByKind): VbType {
    return kind.startsWith('asset') ? 'asset' : kind.startsWith('character') ? 'character' : kind === 'goalStage' ? 'goal' : 'location';
  }
  /** Every state of the subject's property, as a row (keeping any text and Stress already written for it). */
  private rowsFor(subject: ConditionVariesBy['subject'], old: ConditionVariesBy['rows'] = []): ConditionVariesBy['rows'] {
    return this.statesOf(subject.kind).map(s => old.find(r => r.state === s.value) ?? { state: s.value, text: '', stress: 0 });
  }
  statesOf(kind: VariesByKind): { value: string; label: string }[] {
    const factions = this.store.factions().filter(f => f.active).map(f => ({ value: f.id, label: f.name }));
    switch (kind) {
      case 'assetStatus': return ASSET_STATUS_OPTIONS;
      case 'assetController': return [...factions, { value: '', label: 'No one' }];
      case 'characterState': return CHARACTER_STATE_OPTIONS;
      case 'characterFaction': return [...factions, { value: '', label: 'No faction' }];
      case 'locationState': return LOCATION_STATE_OPTIONS;
      case 'goalStage': return GOAL_STAGE_OPTIONS;
    }
  }
  /** The card's rows. A goal's stages, or a holder / faction (one row per faction), show only those written for: most
   *  of them bring nothing about. A status or state table shows every row, since its blanks are few and telling. */
  cardRows(vb: ConditionVariesBy): ConditionVariesBy['rows'] {
    const sparse = vb.subject.kind === 'goalStage' || vb.subject.kind === 'assetController' || vb.subject.kind === 'characterFaction';
    return sparse ? vb.rows.filter(r => r.text.trim()) : vb.rows;
  }
  stateLabel(kind: VariesByKind, state: string): string { return this.statesOf(kind).find(s => s.value === state)?.label ?? state; }
  setMode(m: 'requirements' | 'varies'): void {
    this.mode.set(m);
    if (m === 'varies' && !this.vb()) this.setVbKind('assetStatus', '');
  }
  setVbType(type: VbType): void { this.setVbKind(this.vbProperties[type][0].kind, ''); }
  setVbKind(kind: VariesByKind, id = this.vb()?.subject.id ?? ''): void {
    const subject = { kind, id: this.vbTypeOf(kind) === this.vbTypeOf(this.vb()?.subject.kind ?? kind) ? id : '' };
    this.vb.set({ subject, rows: this.rowsFor(subject, this.vb()?.subject.kind === kind ? this.vb()!.rows : []) });
  }
  setVbEntity(id: string): void { const v = this.vb(); if (v) this.vb.set({ ...v, subject: { ...v.subject, id } }); }
  setVbRow(i: number, patch: Partial<ConditionVariesBy['rows'][number]>): void {
    const v = this.vb(); if (v) this.vb.set({ ...v, rows: v.rows.map((r, k) => k === i ? { ...r, ...patch } : r) });
  }
  vbEntities(kind: VariesByKind): { id: string; name: string }[] { return this.entitiesOf(this.vbTypeOf(kind)); }
  close(): void { this.editing.set(null); }
  patch(p: Partial<WorldCondition>): void { const e = this.editing(); if (e) this.editing.set({ ...e, ...p }); }

  // ── requirements ────────────────────────────────────────────────────────
  addRequirement(): void { this.reqs.update(rs => [...rs, newRequirement('assetController')]); }
  removeRequirement(i: number): void { this.reqs.update(rs => rs.filter((_, k) => k !== i)); }
  /** A new entity type starts its first verb, with no entity chosen. */
  setEntityType(i: number, type: EntityType): void { this.reqs.update(rs => rs.map((r, k) => k === i ? requirementFor(VERBS[type][0]) : r)); }
  setEntity(i: number, id: string): void {
    const r = this.reqs()[i];
    this.setField(i, r.kind === 'leaderCapable' ? 'factionId' : TYPE_OF[r.kind] === 'asset' ? 'assetId' : TYPE_OF[r.kind] === 'character' ? 'characterId'
      : TYPE_OF[r.kind] === 'location' ? 'locationId' : TYPE_OF[r.kind] === 'goal' ? 'goalId' : 'conditionId', id);
  }
  /** A new verb keeps the entity; its object starts empty. */
  setVerb(i: number, key: string): void {
    const r = this.reqs()[i], verb = VERBS[TYPE_OF[r.kind]].find(v => v.key === key)!;
    this.reqs.update(rs => rs.map((x, k) => k === i ? requirementFor(verb, entityIdOf(r)) : x));
  }
  /** The entities offered for a requirement's type. */
  entitiesOf(type: EntityType): { id: string; name: string }[] {
    switch (type) {
      case 'asset': return this.store.assets().map(a => ({ id: a.id, name: a.name }));
      case 'character': return this.store.characters().map(c => ({ id: c.id, name: c.name }));
      case 'faction': return this.store.factions().filter(f => f.active).map(f => ({ id: f.id, name: f.name }));
      case 'location': return this.store.locations().map(l => ({ id: l.id, name: l.name }));
      case 'condition': return this.otherConditions().map(c => ({ id: c.id, name: c.title }));
      case 'goal': {   // Achieve goals (a Maintain goal has no stages), by faction then title
        const fac = (id: string) => this.store.factions().find(f => f.id === id)?.name ?? '';
        return this.store.factionGoals().filter(g => g.conditionType !== 'Maintain')
          .map(g => ({ id: g.id, name: `${g.title} (${fac(g.factionId)})` })).sort((a, b) => a.name.localeCompare(b.name));
      }
    }
  }

  // ── Condition Type: Event (off until an Event establishes it) or Entity (in force while its
  // requirements hold). Stored as activeAtStart; an Event condition keeps no requirements. ──
  readonly conditionType = computed((): 'event' | 'entity' => this.editing()?.activeAtStart ? 'entity' : 'event');
  setConditionType(t: 'event' | 'entity'): void { this.patch({ activeAtStart: t === 'entity' }); }
  /** Requirements an Event condition would drop on save (data from before the toggle may combine both). */
  readonly droppedRequirements = computed(() => this.conditionType() === 'event' ? this.reqs().map(r => this.requirementLabel(r)) : []);
  /** A "varies by" table an Event condition would drop on save. */
  readonly droppedTable = computed(() => this.conditionType() === 'event' && this.mode() === 'varies' && !!this.vb());
  setField(i: number, field: string, value: unknown): void {
    this.reqs.update(rs => rs.map((r, k) => k === i ? { ...r, [field]: value } as ConditionRequirement : r));
  }
  toggleIn(i: number, field: 'statuses' | 'states' | 'stages', value: string, on: boolean): void {
    const r = this.reqs()[i] as unknown as Record<string, string[]>;
    const set = new Set(r[field] ?? []); if (on) set.add(value); else set.delete(value);
    this.setField(i, field, [...set]);
  }
  has(r: ConditionRequirement, field: 'statuses' | 'states' | 'stages', value: string): boolean {
    return ((r as unknown as Record<string, string[]>)[field] ?? []).includes(value);
  }
  readonly incomplete = computed(() => this.conditionType() === 'entity' && (this.mode() === 'varies'
    ? !this.vb()?.subject.id || !this.vb()!.rows.some(r => r.text.trim())
    : this.reqs().some(r => !complete(r))));

  save(): void {
    const e = this.editing(); if (!e || !e.title.trim() || this.incomplete()) return;
    const table = this.conditionType() === 'entity' && this.mode() === 'varies';
    this.store.saveWorldCondition({
      ...e, title: e.title.trim(),
      // a "varies by" condition is its table: no single rule, requirements or Stress of its own (each row has its Stress)
      rule: table ? '' : e.rule.trim(), ruleOtherwise: table ? null : e.ruleOtherwise?.trim() || null,
      requirementsJson: e.activeAtStart && !table ? JSON.stringify(this.reqs()) : '[]',   // an Event condition keeps no requirements
      stressContribution: table ? 0 : Math.round(+e.stressContribution || 0),
      variesByJson: table ? JSON.stringify({ ...this.vb()!, rows: this.vb()!.rows.map(r => ({ ...r, text: r.text.trim(), stress: Math.round(+r.stress || 0) })) }) : null,
    });
    this.close();
  }
  // ── CSV ─────────────────────────────────────────────────────────────────
  exportCsv(): void {
    const rows = [...this.store.worldConditions()].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)).map(conditionToCsvRow);
    downloadCsv([CONDITION_CSV_HEADER, ...rows], 'world-conditions.csv');
  }
  importCsv(event: Event): void {
    const input = event.target as HTMLInputElement, file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      input.value = '';
      const rows = parseCsv(reader.result as string);
      if (rows.length < 2) return;
      const h = csvHeaderMap(rows[0]);
      if (!h.has('title') || !h.has('requirements')) { alert('Unrecognized file format. Expected a World Conditions export.'); return; }
      const existingById = new Map(this.store.worldConditions().map(c => [c.id, c]));
      const tally = new ImportTally(), problems: string[] = [];
      for (const row of rows.slice(1)) {
        const get = (col: string) => row[h.get(col) ?? -1] ?? '';
        const r = conditionFromCsvRow(get, existingById.get(get('id').trim()), this.store.activeCampaign()!.id, col => h.has(col));
        if ('error' in r) { tally.count('skipped'); problems.push(r.error); continue; }
        if (r.condition.requirementsJson.includes(`"${r.condition.id}"`)) { tally.count('skipped'); problems.push(`"${r.condition.title}" requires itself`); continue; }
        tally.track(existingById.has(r.condition.id) ? 'replaced' : 'added', this.store.saveWorldCondition(r.condition));
      }
      tally.report(this.toast, 'World Conditions');
      if (problems.length) alert(`Some rows were skipped:\n${problems.join('\n')}`);
    };
    reader.readAsText(file);
  }

  remove(c: WorldCondition): void {
    if (!confirm(`Delete the World Condition "${c.title}"? Events that established or ended it keep their records; requirements naming it never hold.`)) return;
    this.store.deleteWorldCondition(c.id);
    this.close();
  }
}
