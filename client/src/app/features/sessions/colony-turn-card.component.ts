import { Component, computed, inject, input, signal } from '@angular/core';
import { AppStore } from '../../store/app.store';
import { CharacterInstability, ColonyTurnPhase, Session } from '../../core/models/types';
import { ColonyTurnService, PreparedFactionPhase, PreparedOpening, PreparedCharacterPhase, TurnDraftBase } from '../../core/services/colony-turn.service';
import { CharacterPhaseResults, CpCheckResult } from '../../core/sim/character-phase';
import { DiceOverride, FactionPhaseResults, FpAttempt, Degree } from '../../core/sim/faction-phase';
import { rerollDie } from '../../core/sim/prng';
import { reviewBoard } from './colony-turn-review';
import { ColonyTurnResultsComponent } from './colony-turn-results.component';
import { CampaignWorld, stateBefore, stateAfterTurnEvent, withDraftTurnEvent } from '../../core/sim/colony-turn';
import { evaluateConditions, conditionWorldAt, conditionChanges as diffConditions, goalStageTexts } from '../../core/sim/conditions';
import { OpeningResults } from '../../core/sim/opening';
import { championVacancies } from '../../core/sim/goals';
import { projectCharacters, projectGoals } from '../../core/sim/replay';

type Step = 'faction' | 'character' | 'review';
interface SummaryItem { text: string; cls: string }
interface SummarySection { title: string; items: SummaryItem[] }

/** What the recorded history looks like, cheaply: every session's events and Effects (the store's copy). */
function fingerprint(sessions: Session[]): string {
  return [...sessions].sort((a, b) => a.number - b.number).map(s => `${s.id}:${s.number}:${s.act}:` + (s.events ?? [])
    .map(e => `${e.id}/${e.sortOrder}/` + e.effects.map(ef => `${ef.id},${ef.targetId},${ef.property},${ef.delta},${ef.value ?? ''}`).join(';')).join('|')).join('#');
}

const STEP_LABELS: Record<Step, string> = { faction: 'Factions', character: 'Characters', review: 'Review' };
const DIE_FACES = ['', 'one', 'two', 'three', 'four', 'five', 'six'];

/** One goal on the Factions board (§18.5 layout): its attempts, its progress after the Turn, and what became true. */
export interface BoardGoal {
  id: string; title: string;
  attempts: FpAttempt[]; unrolled: number[];   // rolled attempts; placeholders for attempts never rolled
  advanced: boolean; preempted: boolean;
  pending: boolean; accepted: boolean;         // Ready to Resolve: the GM accepts now or defers to the session
  deferred: boolean;                           // explicitly deferred: no world result; a task for the session
  dots: 1 | 2 | 3;                             // Planning ●○○ · Progressing ●●○ · Accomplished ●●● (after the Turn)
  world?: string;                              // the World State this result makes (or would make) true
}
/** §18.12: a guard the faction posted this Turn (a drawn Maintain assignment) and the targets it defends. */
export interface BoardGuard { id: string; title: string; target: string; bonus: number; priority: string }
export interface BoardFaction { id: string; name: string; momentum: number; goals: BoardGoal[]; guards: BoardGuard[] }

/** One character on the Characters board: a Defection Check, a Drift Roll, or a Settling (no dice). */
export interface BoardCharacter {
  id: string; name: string; leader: boolean;
  kind: 'check' | 'roll' | 'settled';
  dice?: [number, number];
  outcome: 'left' | 'stayed' | 'worse' | 'crisis' | 'better' | 'same' | 'settled';
  dots: 0 | 1 | 2 | 3;                         // Stable ●○○ · Conflicted ●●○ · Compromised ●●● (after); 0 = left the faction
  title: string;                               // the tooltip: the full roll
}
export interface BoardCharacterFaction { id: string; name: string; rows: BoardCharacter[] }
const INSTABILITY_DOTS: Record<CharacterInstability, 1 | 2 | 3> = { Stable: 1, Conflicted: 2, Compromised: 3 };

/**
 * The Colony Turn before a session, as its own card between session cards. A carousel of two screens and a review:
 * Factions (operations in Acts II–III, as a board of faction cards, §18.5) → Characters (Defection Checks, Settling,
 * Drift Rolls: every character action) → Review. The Opening's Momentum resolution is computed but not shown: changes
 * made during a Turn appear once it is complete. Each step is computed when it is reached, from the earlier steps' results;
 * nothing is written until Confirm, which commits the whole turn at once. Changing dice on a step recomputes every
 * later step when it is next reached.
 */
@Component({
  selector: 'app-colony-turn-card',
  standalone: true,
  imports: [ColonyTurnResultsComponent],
  templateUrl: './colony-turn-card.component.html',
  styleUrl: './colony-turn-card.component.scss',
})
export class ColonyTurnCardComponent {
  store = inject(AppStore);
  ct = inject(ColonyTurnService);
  session = input.required<Session>();

  readonly base = signal<TurnDraftBase | null>(null);
  readonly opening = signal<PreparedOpening | null>(null);
  readonly faction = signal<PreparedFactionPhase | null>(null);
  readonly character = signal<PreparedCharacterPhase | null>(null);
  readonly factionDice = signal<DiceOverride>({});
  readonly characterDice = signal<Record<string, [number, number]>>({});
  readonly stepIndex = signal(0);
  readonly accepted = signal<string[]>([]);   // §18.5: Ready to Resolve goals the GM accepts during the Turn
  readonly deferred = signal<string[]>([]);   // ...and those explicitly deferred (undecided ones are saved as deferred too)

  readonly turn = computed(() => this.ct.turnFor(this.session().id));
  readonly livePhases = computed(() => (this.turn()?.phases ?? []).filter(p => p.status !== 'Voided'));
  readonly steps: Step[] = ['faction', 'character', 'review'];
  readonly hasOperations = computed(() => true);   // §18.6: a Faction Phase in every Act (Earliest Act decides what can roll)
  readonly step = computed(() => this.steps[this.stepIndex()]);
  readonly isLast = computed(() => this.stepIndex() === this.steps.length - 1);
  readonly label = (s: Step) => STEP_LABELS[s];

  /** The Characters board: only factions with character activity this Turn; checks first, then the Drift Roll, then
   *  Settlings. Changes to Momentum a departure causes appear once the Turn is complete (next Turn's Opening). */
  readonly characterBoard = computed((): BoardCharacterFaction[] => {
    const p = this.character();
    if (!p) return [];
    const { inputs: inp, results: r } = p;
    const leaderOf = (fid: string) => this.store.factions().find(f => f.id === fid)?.leaderId;
    const rows = new Map<string, BoardCharacter[]>();
    const add = (fid: string, row: BoardCharacter) => { if (!rows.has(fid)) rows.set(fid, []); rows.get(fid)!.push(row); };
    const reroll = (src: string) => src === 'reroll' ? ' · re-rolled' : '';
    for (const c of r.checks) {
      const k = inp.checks.find(x => x.characterId === c.characterId)!;
      add(c.factionId, {
        id: c.characterId, name: k.name, leader: k.isLeader, kind: 'check', dice: [c.d1, c.d2],
        outcome: c.left ? 'left' : 'stayed', dots: c.left ? 0 : 2,
        title: `Defection Check · ${k.label} toward ${this.factionName(c.factionId)} (${this.sign(k.modifier)}) · 2d6 ${c.d1}+${c.d2}`
          + ` ${this.sign(k.modifier)} = ${c.total} vs ${inp.defectionTarget}: ${c.left ? 'leaves the faction (→ Stable)' : 'stays (→ Conflicted)'}`
          + `${c.left && k.isLeader ? ' · the faction loses its leader: −1 Momentum next Turn' : ''}${reroll(c.source)}. Click a die to re-roll it.`,
      });
    }
    for (const x of r.rolls) {
      add(x.factionId, {
        id: x.characterId, name: this.characterName(x.characterId), leader: leaderOf(x.factionId) === x.characterId, kind: 'roll',
        dice: [x.d1, x.d2],
        outcome: x.to === x.from ? 'same' : x.to === 'Compromised' ? 'crisis' : x.to === 'Stable' ? 'better' : 'worse',
        dots: INSTABILITY_DOTS[x.to],
        title: `Drift Roll · Drift Risk ${x.drift} (${x.band}, ${this.sign(x.modifier)}) · 2d6 ${x.d1}+${x.d2} ${this.sign(x.modifier)} = ${x.total}`
          + ` vs ${inp.target}: ${x.from === x.to ? `stays ${x.to}` : `${x.from} → ${x.to}`}${x.to === 'Compromised' ? ' (a crisis: play has one session to act)' : ''}`
          + `${reroll(x.source)}. Click a die to re-roll it.`,
      });
    }
    for (const id of r.settled) {
      const c = inp.characters.find(x => x.id === id)!;
      add(c.factionId, { id, name: c.name, leader: leaderOf(c.factionId) === id, kind: 'settled', outcome: 'settled', dots: 1,
                         title: 'Settled: Steady again, so Conflicted → Stable (no roll)' });
    }
    return inp.factions.filter(f => rows.has(f)).map(f => ({ id: f, name: this.factionName(f), rows: rows.get(f)! }));
  });

  /** The Factions board: only factions with operations this Turn, each goal in attempt order. */
  readonly board = computed((): BoardFaction[] => {
    const p = this.faction();
    if (!p) return [];
    const r = p.results, inp = p.build.inputs;
    const posted = new Set(r.guarding ?? []);
    return inp.factions.filter(f => r.allocations.some(a => a.factionId === f.id) || (inp.guards ?? []).some(g => g.factionId === f.id && posted.has(g.id))).map(f => ({
      id: f.id, name: this.factionName(f.id), momentum: f.momentum,
      guards: (inp.guards ?? []).filter(g => g.factionId === f.id && posted.has(g.id)).map((g): BoardGuard => ({
        id: g.id, title: g.title, target: this.targetName(g.targetEntityId), bonus: inp.priorityBonus?.[g.priority] ?? 0, priority: g.priority })),
      goals: r.allocations.filter(a => a.factionId === f.id).map((a): BoardGoal => {
        const res = r.goals.find(x => x.goalId === a.goalId)!, g = inp.goals.find(x => x.id === a.goalId)!;
        const attempts = r.attempts.filter(x => x.goalId === a.goalId);
        const accepted = r.accepted.includes(a.goalId), pending = res.outcome === 'ReadyToResolve';
        const done = res.outcome === 'Accomplished' || accepted;
        return {
          id: a.goalId, title: this.goalTitle(a.goalId), attempts,
          unrolled: Array.from({ length: a.attempts - attempts.length }, (_, i) => i),
          advanced: res.outcome !== 'None', preempted: res.preempted, pending, accepted,
          deferred: pending && !accepted && this.deferred().includes(a.goalId),
          dots: done ? 3 : res.outcome === 'Progressing' || g.status === 'Progressing' ? 2 : 1,
          // what becomes true: the World Conditions the goal drives, at its new stage (pending: what accepting it brings)
          world: res.outcome === 'Progressing' ? this.worldResult(a.goalId, 'Progressing')
            : done || pending ? this.worldResult(a.goalId, 'Accomplished') : undefined,
        };
      }),
    }));
  });

  readonly draftSummary = computed(() =>
    this.summaryOf(this.opening()?.results, this.faction()?.results, this.character()?.results));
  private readonly reviewNames = {
    faction: (id: string) => this.factionName(id), goal: (id: string) => this.goalTitle(id), character: (id: string) => this.characterName(id),
    worldResult: (id: string, stage: 'Progressing' | 'Accomplished') => this.worldResult(id, stage),
  };
  private worldResult(goalId: string, stage: 'Progressing' | 'Accomplished'): string | undefined {
    return goalStageTexts(this.store.worldConditions(), goalId, stage).join(' ') || undefined;
  }
  /** Review: the draft's results as faction cards (new world states, Momentum gained or lost). */
  readonly draftReview = computed(() => reviewBoard({
    fpInputs: this.faction()?.build.inputs, fpResults: this.faction()?.results,
    cpInputs: this.character()?.inputs, cpResults: this.character()?.results,
  }, this.reviewNames));
  /** §18.6: World Conditions the turn switches on or off (e.g. an Asset changing hands), before → after the turn. */
  private conditionDelta(world: CampaignWorld, afterWorld: CampaignWorld) {
    const conds = this.store.worldConditions();
    if (!conds.length) return { started: [], ended: [] };
    const sid = this.session().id;
    const names = { asset: (id: string) => world.assets.find(a => a.id === id)?.name ?? id, faction: (id: string) => this.factionName(id),
                    character: (id: string) => this.characterName(id), location: (id: string) => world.locations.find(l => l.id === id)?.name ?? id,
                    goal: (id: string) => world.goals.find(g => g.id === id)?.title ?? id };
    const at = (w: CampaignWorld, snap: ReturnType<typeof stateBefore>) =>
      evaluateConditions(conds, conditionWorldAt(snap, { assets: w.assets, characters: w.characters, factions: w.factions, locations: w.locations, goals: w.goals }), names);
    return diffConditions(at(world, stateBefore(world, sid)), at(afterWorld, stateAfterTurnEvent(afterWorld, sid)));
  }
  readonly draftConditions = computed(() => {
    const b = this.base(); if (!b || !this.character()) return { started: [], ended: [] };
    const all = [...this.priorToCharacter(), ...(this.character()?.effects ?? [])];
    return this.conditionDelta(b.world, withDraftTurnEvent(b.world, b.sessionId, all));
  });
  readonly committedConditions = computed(() => {
    if (this.turn()?.status !== 'Committed') return { started: [], ended: [] };
    const w: CampaignWorld = { colonyState: this.store.colonyState()!, factions: this.store.factions(), characters: this.store.characters(),
      assets: this.store.assets(), goals: this.store.factionGoals(), locations: this.store.locations(), sessions: this.store.sessions(), rules: this.store.rules(),
      conditions: this.store.worldConditions() };
    return w.colonyState ? this.conditionDelta(w, w) : { started: [], ended: [] };
  });

  /** Faction Goals.md §I: champions are reassigned by hand. Before the turn is complete, list each faction's living members
   *  who champion nothing (as of the start of this turn), so the GM can assign them before drawing. */
  readonly championVacancies = computed(() => {
    const cs = this.store.colonyState();
    if (!cs || this.turn()?.status === 'Committed') return [];
    const w: CampaignWorld = { colonyState: cs, factions: this.store.factions(), characters: this.store.characters(),
      assets: this.store.assets(), goals: this.store.factionGoals(), locations: this.store.locations(), sessions: this.store.sessions(), rules: this.store.rules(),
      conditions: this.store.worldConditions() };
    const snap = stateBefore(w, this.session().id);
    const operating = new Set(w.factions.filter(f => f.active && f.type === 'Faction').map(f => f.id));
    return championVacancies(projectCharacters(w.characters, snap), projectGoals(w.goals, snap))
      .filter(v => operating.has(v.factionId))
      .map(v => ({ id: v.factionId, name: this.factionName(v.factionId), people: v.available.map(c => c.name).join(', '), unassigned: v.unassigned.length }));
  });

  /** A completed turn's recorded results, the same way. */
  readonly committedReview = computed(() => {
    const phase = (kind: ColonyTurnPhase['kind']) => this.livePhases().find(x => x.kind === kind);
    const json = <T>(text: string | undefined): T | undefined => { try { return text ? JSON.parse(text) as T : undefined; } catch { return undefined; } };
    const fp = phase('FactionPhase'), cp = phase('CharacterPhase'), op = phase('Opening');
    return reviewBoard({
      fpInputs: json(fp?.frozenInputsJson), fpResults: json(fp?.resultsJson),
      cpInputs: json(cp?.frozenInputsJson), cpResults: json(cp?.resultsJson),
      legacyChecks: json<{ checks?: CpCheckResult[] }>(op?.resultsJson)?.checks,
    }, this.reviewNames);
  });
  readonly committedSummary = computed(() => {
    const parse = <T>(kind: ColonyTurnPhase['kind']): T | undefined => {
      const p = this.livePhases().find(x => x.kind === kind);
      try { return p ? JSON.parse(p.resultsJson) as T : undefined; } catch { return undefined; }
    };
    return this.summaryOf(parse<OpeningResults>('Opening'), parse<FactionPhaseResults>('FactionPhase'), parse<CharacterPhaseResults>('CharacterPhase'));
  });

  // ── staleness ────────────────────────────────────────────────────────────
  /** The recorded history a draft was drawn from: any saved change to it (an Event, a session, another Turn) makes
   *  the draft out of date (the server would refuse it), so the card says so instead of showing old results. */
  private readonly historyPrint = computed(() => fingerprint(this.store.sessions()));
  private readonly drawnFrom = signal<string | null>(null);
  readonly draftStale = computed(() => !!this.base() && this.drawnFrom() !== null && this.drawnFrom() !== this.historyPrint());

  /** A saved turn recorded before a turn for an EARLIER session was saved: its results were computed on history as it
   *  was then; replay still applies its recorded Effects, which may no longer read the same (M7: reinterpretation). */
  readonly recordedOnOlderHistory = computed((): number | null => {
    const t = this.turn();
    if (t?.status !== 'Committed' || !t.committedAt) return null;
    const num = (sid: string) => this.store.sessions().find(s => s.id === sid)?.number ?? 0;
    const mine = num(t.sessionId);
    const later = this.ct.turns().filter(x => x.status === 'Committed' && x.committedAt && num(x.sessionId) < mine && x.committedAt > t.committedAt!);
    return later.length ? Math.max(...later.map(x => num(x.sessionId))) : null;
  });

  factionName(id: string): string { return this.store.factions().find(f => f.id === id)?.name ?? id; }
  goalTitle(id: string): string { return this.store.factionGoals().find(g => g.id === id)?.title ?? id; }
  characterName(id: string): string { return this.store.characters().find(c => c.id === id)?.name ?? id; }
  sign(n: number): string { return n > 0 ? `+${n}` : `${n}`; }

  // ── carousel ─────────────────────────────────────────────────────────────
  async begin(): Promise<void> {
    const d = await this.ct.begin(this.session().id);
    if (!d) return;
    const { opening, ...base } = d;
    this.base.set(base); this.opening.set(opening);
    this.faction.set(null); this.character.set(null);
    this.factionDice.set({}); this.characterDice.set({}); this.accepted.set([]); this.deferred.set([]);
    this.drawnFrom.set(this.historyPrint());
    this.ensure('faction');   // the first screen: Momentum resolution and (Acts II–III) operations
    this.stepIndex.set(0);
  }

  /** Start the Turn over: fresh history, a new seed, no re-rolls or acceptances. Nothing had been saved. */
  async reset(): Promise<void> {
    this.ct.error.set(null);
    await this.begin();
  }

  back(): void { if (this.stepIndex() > 0) this.stepIndex.update(i => i - 1); }

  /** Move to the next step, computing it from the steps before it if it is not computed yet. */
  next(): void {
    const target = this.steps[this.stepIndex() + 1];
    if (!target) return;
    this.ensure(target);
    this.stepIndex.update(i => i + 1);
  }

  /** Jump to a step already reached (every step before it is computed). */
  goTo(i: number): void {
    if (i <= this.stepIndex() || this.reached(i)) { for (let k = 0; k <= i; k++) this.ensure(this.steps[k]); this.stepIndex.set(i); }
  }
  reached(i: number): boolean {
    const s = this.steps[i];
    return s === 'faction' || (s === 'character' && !!this.character())
      || (s === 'review' && !!this.character());
  }

  private ensure(s: Step): void {
    const b = this.base(), o = this.opening();
    if (!b || !o) return;
    if (s === 'faction' && this.hasOperations() && !this.faction())
      this.faction.set(this.ct.draftFactionPhase(b, o.effects, this.factionDice(), this.fpOptions()));
    if (s === 'character' && !this.character()) {
      this.ensure('faction');
      this.character.set(this.ct.withCharacterDice(this.ct.draftCharacterPhase(b, this.priorToCharacter()), this.characterDice(), { overrideSource: 'reroll' }));
    }
  }
  private priorToCharacter() { return [...(this.opening()?.effects ?? []), ...(this.faction()?.effects ?? [])]; }

  async confirm(): Promise<void> {
    const b = this.base(), o = this.opening(), c = this.character(), f = this.faction();
    if (!b || !o || !c || this.draftStale()) return;
    const phases: Parameters<ColonyTurnService['complete']>[1] = [{ kind: 'Opening', inputs: o.inputs, results: o.results, effects: o.effects }];
    if (f) phases.push({ kind: 'FactionPhase', inputs: f.build.inputs, results: f.results, effects: f.effects });
    phases.push({ kind: 'CharacterPhase', inputs: c.inputs, results: c.results, effects: c.effects });
    if (await this.ct.complete(b, phases)) { this.base.set(null); this.opening.set(null); this.faction.set(null); this.character.set(null); }
  }

  // ── dice (a change invalidates every later step) ─────────────────────────
  private fpOptions() { return { overrideSource: 'reroll' as const, accepted: this.accepted() }; }
  private refreshFaction(): void {
    const p = this.faction(); if (!p) return;
    this.faction.set(this.ct.withDice(p, this.factionDice(), this.fpOptions()));
    this.character.set(null); this.characterDice.set({});   // the Character Phase builds on the Faction Phase
  }
  /** §18.5: clicking a die re-rolls it (date-time + seed). Later attempts of the goal follow from the new result. */
  rerollDie(a: FpAttempt, which: 0 | 1): void {
    const b = this.base(); if (!b) return;
    const face = rerollDie(b.seed, `${a.id}/${which}/${Object.keys(this.factionDice()).length}`);
    const cur = this.factionDice()[a.id] ?? [a.d1, a.d2];
    this.factionDice.set({ ...this.factionDice(), [a.id]: (which === 0 ? [face, cur[1]] : [cur[0], face]) as [number, number] });
    this.refreshFaction();
  }
  /** Accept resolves a Ready to Resolve goal now (as if it Auto-Resolved); Defer leaves it a task for the session.
   *  Clicking the chosen option again returns the goal to undecided (saved as deferred if left so). */
  setAccepted(goalId: string, on: boolean): void {
    const wasOn = on ? this.accepted().includes(goalId) : this.deferred().includes(goalId);
    this.accepted.set(this.accepted().filter(id => id !== goalId));
    this.deferred.set(this.deferred().filter(id => id !== goalId));
    if (!wasOn) (on ? this.accepted : this.deferred).update(xs => [...xs, goalId]);
    this.refreshFaction();
  }
  /** Clicking a die on the Characters board re-rolls it (date-time + seed), for a Defection Check or a Drift Roll alike.
   *  A check's outcome never changes who rolls: the faction's Drift Roll is consumed either way. */
  rerollCharacterDie(characterId: string, cur: [number, number], which: 0 | 1): void {
    const b = this.base(), p = this.character(); if (!b || !p) return;
    const face = rerollDie(b.seed, `cp/${characterId}/${which}/${Object.keys(this.characterDice()).length}`);
    const next = { ...this.characterDice(), [characterId]: (which === 0 ? [face, cur[1]] : [cur[0], face]) as [number, number] };
    this.characterDice.set(next);
    this.character.set(this.ct.withCharacterDice(p, next, { overrideSource: 'reroll' }));
  }

  async discardLegacy(): Promise<void> {
    const t = this.turn();
    if (!t || !confirm('Discard this unfinished Colony Turn? Its Effects are removed; you can then run the turn again.')) return;
    await this.ct.voidTurn(t);
  }

  // ── views ────────────────────────────────────────────────────────────────
  dieIcon(face: number): string { return `fa-solid fa-dice-${DIE_FACES[face] ?? 'd6'}`; }
  dieClass(a: FpAttempt): string {
    return a.degree === 'CriticalSuccess' ? 'fp-die fp-die--crit-ok' : a.degree === 'CriticalFailure' ? 'fp-die fp-die--crit-fail' : 'fp-die';
  }
  succeeded(a: FpAttempt): boolean { return a.degree === 'Success' || a.degree === 'CriticalSuccess'; }
  /** §18.12: "2d6 4+3 · Priority +2 · Momentum +1 = 10 vs DC 10 + 2 (guarded by Protect the Ledger, Major) = 12: Failure". */
  attemptTitle(a: FpAttempt): string {
    const p = this.faction(), inp = p?.build.inputs;
    const parts = [`2d6 ${a.d1}+${a.d2}`];
    if (a.priority) parts.push(`Priority ${this.sign(a.priority)}`);
    if (a.modifier) parts.push(`Momentum ${this.sign(a.modifier)}`);
    const guard = a.guardId ? inp?.guards?.find(g => g.id === a.guardId) : undefined;
    const dc = a.defense ? `DC ${inp?.target ?? a.dc - a.defense} + ${a.defense} (guarded by ${guard?.title ?? 'a defender'}, ${guard?.priority ?? ''}) = ${a.dc}` : `DC ${a.dc}`;
    const crit = a.signal > 0 ? ' (+1 Momentum next Turn)' : a.signal < 0 ? ' (−1 Momentum next Turn)' : '';
    return `${parts.join(' · ')} = ${a.total} vs ${dc}: ${this.degreeLabel(a.degree)}${crit}`
      + `${a.source === 'reroll' ? ' · re-rolled' : ''}. Click a die to re-roll it.`;
  }
  private targetName(id: string): string {
    return this.store.assets().find(a => a.id === id)?.name ?? this.store.characters().find(c => c.id === id)?.name ?? id;
  }
  dotsLabel(n: number): string { return n === 3 ? 'Accomplished' : n === 2 ? 'Progressing' : 'Planning'; }
  instabilityLabel(n: number): string { return n === 3 ? 'Compromised (crisis)' : n === 2 ? 'Conflicted' : n === 1 ? 'Stable' : 'Left the faction'; }
  checkOf(p: PreparedCharacterPhase, characterId: string) { return p.inputs.checks.find(c => c.characterId === characterId)!; }
  attemptsOf(r: FactionPhaseResults, goalId: string): FpAttempt[] { return r.attempts.filter(a => a.goalId === goalId); }
  degreeClass(d: Degree): string {
    return d === 'CriticalSuccess' ? 'deg crit-ok' : d === 'Success' ? 'deg ok' : d === 'CriticalFailure' ? 'deg crit-fail' : 'deg fail';
  }
  degreeLabel(d: Degree): string {
    return d === 'CriticalSuccess' ? 'Critical Success' : d === 'CriticalFailure' ? 'Critical Failure' : d;
  }
  outcomeLabel(o: string, preempted: boolean): string {
    if (preempted) return 'pre-empted';
    return o === 'Progressing' ? 'Progressing' : o === 'Accomplished' ? 'Accomplished' : o === 'ReadyToResolve' ? 'Ready to Resolve' : o === 'Accepted' ? 'Accomplished (accepted)' : 'no advance';
  }
  /** What a turn did, as the two screens group it (the Review step and a committed turn's card). Defection Checks
   *  recorded in an older Opening (op-2/op-3) are shown with the Character Phase, where they now belong. */
  private summaryOf(o?: OpeningResults, f?: FactionPhaseResults, c?: CharacterPhaseResults): SummarySection[] {
    const out: SummarySection[] = [];
    if (o || f) {
      const items: SummaryItem[] = [
        ...(o?.resolutions ?? []).filter(x => x.to !== x.from).map(x => ({ text: `${this.factionName(x.factionId)} Momentum ${this.sign(x.from)} → ${this.sign(x.to)}`, cls: 'ct-meta' })),
        ...(f?.goals ?? []).filter(g => g.outcome !== 'None').map(g => ({ text: `${this.factionName(g.factionId)}: ${this.goalTitle(g.goalId)} → ${this.outcomeLabel((f!.accepted ?? []).includes(g.goalId) ? 'Accepted' : g.outcome, g.preempted)}`, cls: 'ct-outcome ct-outcome--adv' })),
        ...(f?.attempts ?? []).filter(a => a.signal).map(a => ({ text: `${this.factionName(a.factionId)} ${this.degreeLabel(a.degree)} (${a.d1}+${a.d2})`, cls: this.degreeClass(a.degree) })),
      ];
      out.push({ title: 'Faction Phase', items: items.length ? items : [{ text: 'Nothing changed', cls: 'ct-meta' }] });
    }
    const checks = [...((o as { checks?: CpCheckResult[] } | undefined)?.checks ?? []), ...(c?.checks ?? [])];
    if (c || checks.length) {
      const items: SummaryItem[] = [
        ...checks.map(x => ({ text: `${this.characterName(x.characterId)} ${x.left ? 'left ' + this.factionName(x.factionId) : 'stayed (Conflicted)'}`, cls: x.left ? 'deg crit-fail' : 'ct-meta' })),
        ...(c?.rolls ?? []).filter(x => x.to !== x.from).map(x => ({ text: `${this.characterName(x.characterId)} ${x.from} → ${x.to}`, cls: x.to === 'Compromised' ? 'deg crit-fail' : 'ct-meta' })),
        ...(c?.settled ?? []).map(id => ({ text: `${this.characterName(id)} settled`, cls: 'ct-meta' })),
      ];
      out.push({ title: 'Character Phase', items: items.length ? items : [{ text: 'Nothing changed', cls: 'ct-meta' }] });
    }
    return out;
  }
}
