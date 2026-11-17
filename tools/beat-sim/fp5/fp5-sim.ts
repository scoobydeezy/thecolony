// Faction Phase candidate rules (2026-10-21), simulated over full 12-session campaigns on the REAL engine.
// Everything except the Faction Phase's allocation and roll is the shipped client code: Power from channels, the Opening
// (Momentum), the Character Phase, goal detection, advance Effects, World Conditions and replay. No play happens: these
// are the autonomous colony's campaigns (no party, no GM resolutions; Ready to Resolve goals wait).
//
//   REF   the shipped engine, whatever its version (fp-4 when this was written: tokens by priority, flat −1 defence, DC 9;
//         since 2026-10-22 fp-5, which is B2S at DC 10)
//   A     passive Maintain: one token per eligible Achieve goal, draw Power-many;
//         2d6 + P(goal) + Momentum ≥ DC + P(highest active defending Maintain goal), P = Critical 3 / Major 2 / Minor 1
//   B     shared Power: one token per eligible Achieve goal AND per active Maintain goal, draw Power-many; a Maintain goal
//         defends this Turn only if it drew a token. Same roll as A.
//   B2    as B, but a Maintain goal enters the draw only while its target is threatened: another faction has an eligible
//         Achieve goal on it this Turn (no Power spent guarding what nobody is after).
//   B2S   as B2, but a Secret goal is unknown to the defender: it does not make its target threatened (a guard posted
//         for another, known threat still defends against it).
//
// Build & run (from colony-tracker/):
//   sed "s#CLIENT/#$PWD/client/#g" tools/beat-sim/fp5/fp5-sim.ts > /tmp/fp5.ts && client/node_modules/.bin/esbuild /tmp/fp5.ts \
//     --bundle --platform=node --outfile=/tmp/fp5.js && node /tmp/fp5.js tools/beat-sim/fp5/world-2026-10-21.json <runs> <config…>
import * as fs from 'fs';
import { buildOpeningInputs, buildFactionPhaseInputs, buildCharacterPhaseInputs, withDraftTurnEvent, stateAfterTurnEvent, CampaignWorld } from 'CLIENT/src/app/core/sim/colony-turn';
import { resolveOpening, openingEffects } from 'CLIENT/src/app/core/sim/opening';
import { resolveCharacterPhase, characterPhaseEffects } from 'CLIENT/src/app/core/sim/character-phase';
import { resolveFactionPhase, factionPhaseEffects, degreeOf, FactionPhaseInputs, FactionPhaseResults, FpGoal } from 'CLIENT/src/app/core/sim/faction-phase';
import { buildColonySnapshots, projectAssets, projectCharacters, projectGoals } from 'CLIENT/src/app/core/sim/replay';
import { worldOf, assessGoal } from 'CLIENT/src/app/core/sim/goals';
import { mulberry32, shuffle, byOrdinal } from 'CLIENT/src/app/core/sim/prng';
import { factionFromApi, characterFromApi, colonyStateFromApi } from 'CLIENT/src/app/core/services/api-mappers';
import { FactionGoal, GoalPriority, Session, TERMINAL_GOAL_STATUSES } from 'CLIENT/src/app/core/models/types';

type Rule = 'REF' | 'A' | 'B' | 'B2' | 'B2S';
interface Cfg { name: string; rule: Rule; dc: number }
const P: Record<GoalPriority, number> = { Critical: 3, Major: 2, Minor: 1 };
const ACT = (n: number) => (n <= 4 ? 1 : n <= 8 ? 2 : 3);

const [file, runsArg, ...cfgArgs] = process.argv.slice(2);
const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
const base: CampaignWorld = {
  colonyState: colonyStateFromApi(raw.colonyState), factions: raw.factions.map(factionFromApi), characters: raw.characters.map(characterFromApi),
  assets: raw.assets, goals: raw.goals, locations: raw.locations, sessions: [], rules: raw.rules, conditions: raw.conditions,
};
const RUNS = Number(runsArg ?? 200);
const CFGS: Cfg[] = cfgArgs.map(a => { const [rule, dc] = a.split(':'); return { name: rule === 'REF' ? 'REF (shipped engine)' : `${rule} DC ${dc}`, rule: rule as Rule, dc: Number(dc ?? 9) }; });

// ── per-campaign stats ─────────────────────────────────────────────────────────────────────────────────────────
interface Stats {
  rolls: number; phases: number; tokens: number; maintainTokens: number; idleFactionPhases: number; factionPhasesWithPower: number;
  defendedRolls: number; defendedSuccesses: number; openRolls: number; openSuccesses: number;
  advancesByAct: number[]; firstSuccesses: number; accomplished: number; ready: number;
  byPriority: Record<GoalPriority, { goals: number; reached: number }>;   // reached = Accomplished or Ready by the end
  powerStart: Record<string, number>; powerEnd: Record<string, number>; powerZeroEnd: number;
  accomplishedByFaction: Record<string, number>;
  guardSecret: { rolls: number; defended: number; successes: number }; guardKnown: { rolls: number; defended: number; successes: number };
  holder: Record<string, string>;   // contested Assets: final controller
}

function variantPhase(inp: FactionPhaseInputs, w: CampaignWorld, sessionId: string, cfg: Cfg, seed: number, st: Stats): ReturnType<typeof factionPhaseEffects> {
  // the defenders, as the engine sees them after this Turn's Opening
  const snap = stateAfterTurnEvent(w, sessionId);
  const gw = worldOf(projectCharacters(w.characters, snap), projectAssets(w.assets, snap));
  const act = w.sessions.find(x => x.id === sessionId)?.act ?? 1;   // an assignment is in force from its Earliest Act (2026-10-22)
  const maintain = projectGoals(w.goals, snap).filter(g => g.conditionType === 'Maintain' && !TERMINAL_GOAL_STATUSES.includes(g.status) && assessGoal(g, gw, act).defense?.active);

  const visibility = new Map(w.goals.map(g => [g.id, g.visibility]));
  // allocation: one token per goal in the pool; draw Power-many (seeded), per faction in ordinal order
  const next = mulberry32(seed >>> 0), dice = mulberry32((seed ^ 0x9E3779B9) >>> 0);
  const drawnAchieve: { f: typeof inp.factions[number]; g: FpGoal }[] = [];
  const guarding = new Set<string>();   // Maintain goals defending this Turn
  for (const f of [...inp.factions].sort((a, b) => byOrdinal(a.id, b.id))) {
    const achieve = inp.goals.filter(g => g.factionId === f.id);
    const threatened = (m: FactionGoal, known: boolean) => inp.goals.some(a => a.factionId !== m.factionId && a.targetEntityId === m.targetEntityId
      && (!known || visibility.get(a.id) !== 'Secret'));
    const mine = cfg.rule === 'B' ? maintain.filter(g => g.factionId === f.id)
               : cfg.rule === 'B2' ? maintain.filter(g => g.factionId === f.id && threatened(g, false))
               : cfg.rule === 'B2S' ? maintain.filter(g => g.factionId === f.id && threatened(g, true)) : [];
    const pool: ({ kind: 'A'; g: FpGoal } | { kind: 'M'; g: FactionGoal })[] = [
      ...achieve.map(g => ({ kind: 'A' as const, g })), ...mine.map(g => ({ kind: 'M' as const, g }))].sort((a, b) => byOrdinal(a.g.id, b.g.id));
    shuffle(pool, next);
    const drawn = pool.slice(0, Math.max(0, f.power));
    if (f.power > 0) { st.factionPhasesWithPower++; if (!drawn.some(d => d.kind === 'A')) st.idleFactionPhases++; }
    st.tokens += drawn.length; st.maintainTokens += drawn.filter(d => d.kind === 'M').length;
    for (const d of drawn) if (d.kind === 'A') drawnAchieve.push({ f, g: d.g }); else guarding.add(d.g.id);
  }
  if (cfg.rule === 'A') for (const g of maintain) guarding.add(g.id);   // passive: every active assignment defends

  // resolution: one roll per drawn goal
  const results: FactionPhaseResults = { version: 'sim', diceSource: 'app', allocations: [], attempts: [], goals: [], accepted: [] };
  for (const { f, g } of drawnAchieve) {
    const defenders = maintain.filter(m => guarding.has(m.id) && m.factionId !== g.factionId && m.targetEntityId && m.targetEntityId === g.targetEntityId);
    const defense = Math.max(0, ...defenders.map(m => P[m.priority]));
    const guardable = maintain.some(m => m.factionId !== g.factionId && m.targetEntityId && m.targetEntityId === g.targetEntityId);
    const d1 = 1 + (dice() % 6), d2 = 1 + (dice() % 6), natural = d1 + d2, total = natural + P[g.priority] + f.momentum;
    const target = cfg.dc + defense, degree = degreeOf(natural, total, target), ok = degree === 'Success' || degree === 'CriticalSuccess';
    st.rolls++;
    if (defense) { st.defendedRolls++; if (ok) st.defendedSuccesses++; } else { st.openRolls++; if (ok) st.openSuccesses++; }
    if (guardable) { const k = visibility.get(g.id) === 'Secret' ? st.guardSecret : st.guardKnown; k.rolls++; if (defense) k.defended++; if (ok) k.successes++; }
    const id = `${g.id}#0`;
    results.allocations.push({ factionId: f.id, goalId: g.id, attempts: 1 });
    results.attempts.push({ id, factionId: f.id, goalId: g.id, index: 0, d1, d2, natural, modifier: P[g.priority] + f.momentum, defense, total, degree,
      signal: degree === 'CriticalSuccess' ? 1 : degree === 'CriticalFailure' ? -1 : 0, source: 'app' } as never);
    const outcome = !ok ? 'None' : g.status === 'Plotting' ? 'Progressing' : g.outcomeMode === 'Adjudicated' ? 'ReadyToResolve' : 'Accomplished';
    results.goals.push({ goalId: g.id, factionId: f.id, allocated: 1, rolled: 1, succeeded: ok, outcome, margin: ok ? total - target : null, preempted: false } as never);
  }
  // collisions (the engine's rule): incompatible Automatic Accomplishments on one target — highest margin, then earlier
  const goal = new Map(inp.goals.map(g => [g.id, g]));
  const want = (id: string) => `${goal.get(id)!.targetOwnerFactionId ?? ''}|${goal.get(id)!.targetState ?? ''}`;
  const byTarget = new Map<string, typeof results.goals>();
  for (const r of results.goals) { const t = goal.get(r.goalId)!.targetEntityId; if (r.outcome === 'Accomplished' && t) byTarget.set(t, [...(byTarget.get(t) ?? []), r]); }
  for (const list of byTarget.values()) {
    if (new Set(list.map(r => want(r.goalId))).size < 2) continue;
    list.sort((a, b) => (b.margin! - a.margin!) || results.goals.indexOf(a) - results.goals.indexOf(b));
    for (const r of list.slice(1)) if (want(r.goalId) !== want(list[0].goalId)) { r.outcome = 'None'; r.preempted = true; }
  }
  return factionPhaseEffects(inp, results);
}

function campaign(cfg: Cfg, run: number): Stats {
  const st: Stats = { rolls: 0, phases: 0, tokens: 0, maintainTokens: 0, idleFactionPhases: 0, factionPhasesWithPower: 0,
    defendedRolls: 0, defendedSuccesses: 0, openRolls: 0, openSuccesses: 0, advancesByAct: [0, 0, 0], firstSuccesses: 0, accomplished: 0, ready: 0,
    byPriority: { Critical: { goals: 0, reached: 0 }, Major: { goals: 0, reached: 0 }, Minor: { goals: 0, reached: 0 } },
    powerStart: {}, powerEnd: {}, powerZeroEnd: 0, accomplishedByFaction: {}, holder: {},
    guardSecret: { rolls: 0, defended: 0, successes: 0 }, guardKnown: { rolls: 0, defended: 0, successes: 0 } };
  let w: CampaignWorld = { ...base, sessions: [] };
  for (let n = 1; n <= 12; n++) {
    const s: Session = { id: `s${n}`, number: n, title: `S${n}`, act: ACT(n), week: n, events: [] } as Session;
    w = { ...w, sessions: [...w.sessions, s] };
    if (n === 1) continue;   // a Colony Turn before each of Sessions 2–12
    const seed = (Math.imul(run + 1, 2654435761) ^ Math.imul(n, 40503) ^ 0x5bd1e995) >>> 0;
    const oi = buildOpeningInputs(w, s.id, seed), oe = openingEffects(oi, resolveOpening(oi));
    const wO = withDraftTurnEvent(w, s.id, oe);
    const fb = buildFactionPhaseInputs(wO, s.id, seed);
    if (n === 2) for (const f of fb.inputs.factions) st.powerStart[f.id] = f.power;
    let fe;
    if (cfg.rule === 'REF') {
      const fr = resolveFactionPhase(fb.inputs);
      fe = factionPhaseEffects(fb.inputs, fr);
      st.rolls += fr.attempts.length;
      for (const a of fr.attempts) { const ok = a.degree === 'Success' || a.degree === 'CriticalSuccess';
        if (a.defense) { st.defendedRolls++; if (ok) st.defendedSuccesses++; } else { st.openRolls++; if (ok) st.openSuccesses++; } }
      for (const f of fb.inputs.factions) if (f.power > 0) { st.factionPhasesWithPower++; if (!fr.allocations.some(x => x.factionId === f.id)) st.idleFactionPhases++; }
      st.tokens += fr.allocations.reduce((t, a) => t + a.attempts, 0) + ((fr as any).guarding?.length ?? 0);
      st.maintainTokens += (fr as any).guarding?.length ?? 0;   // fp-5: the shipped engine posts guards
    } else fe = variantPhase(fb.inputs, wO, s.id, cfg, seed, st);
    st.phases++;
    for (const e of fe) if (e.targetType === 'goal' && e.property === 'status') {
      st.advancesByAct[ACT(n) - 1]++; if (e.value === 'Progressing') st.firstSuccesses++;
    }
    const wF = withDraftTurnEvent(w, s.id, fe as never);
    const ci = buildCharacterPhaseInputs(wF, s.id, seed), ce = characterPhaseEffects(resolveCharacterPhase(ci));
    const all = [...oe, ...fe, ...ce];
    const ev = { id: `ct${n}`, sessionId: s.id, title: `Colony Turn ${n}`, sortOrder: -1, kind: 'ColonyTurn',
                 effects: all.map((e, i) => ({ ...e, id: `ct${n}-${i}`, eventId: `ct${n}`, ordinal: i })) };
    w = { ...w, sessions: w.sessions.map(x => x.id === s.id ? { ...x, events: [ev as never] } : x) };
  }
  // the end of the campaign
  const end = buildColonySnapshots(w.colonyState, w.factions, w.characters, w.sessions, w.rules, w.assets, w.goals, w.locations, w.conditions ?? []).at(-1)!;
  const fbEnd = buildFactionPhaseInputs(withDraftTurnEvent({ ...w, sessions: [...w.sessions, { id: 's13', number: 13, title: 'S13', act: 3, week: 13, events: [] } as never] }, 's13', []), 's13', 1);
  for (const f of fbEnd.inputs.factions) { st.powerEnd[f.id] = f.power; if (!f.power) st.powerZeroEnd++; }
  for (const g of w.goals.filter(g => g.conditionType === 'Achieve')) {
    const status = end.goalStatuses[g.id] ?? g.status, ready = !!end.goalReady[g.id];
    st.byPriority[g.priority].goals++;
    if (status === 'Accomplished' || ready) st.byPriority[g.priority].reached++;
    if (status === 'Accomplished') { st.accomplished++; st.accomplishedByFaction[g.factionId] = (st.accomplishedByFaction[g.factionId] ?? 0) + 1; }
    if (ready && status !== 'Accomplished') st.ready++;
  }
  for (const name of ['Book of Names', 'The Ledger', 'Civic Improvement Fund', 'The Unclaimed Object', 'Hall of the Keepers', 'Hidden Stockpiles', 'The Offering Chest', 'Claims Registry']) {
    const a = w.assets.find(x => x.name === name); if (!a) continue;
    st.holder[name] = (end.assetControl[a.id] ?? a.controllingFactionId) || 'no one';
  }
  return st;
}

// ── aggregate ─────────────────────────────────────────────────────────────────────────────────────────────────
const mean = (xs: number[]) => xs.reduce((t, x) => t + x, 0) / Math.max(1, xs.length);
const out: Record<string, unknown> = {};
for (const cfg of CFGS) {
  const t0 = Date.now(), all: Stats[] = [];
  for (let r = 0; r < RUNS; r++) all.push(campaign(cfg, r));
  const sum = (k: (s: Stats) => number) => all.reduce((t, s) => t + k(s), 0);
  const factions = Object.keys(all[0].powerStart).sort();
  const holders: Record<string, Record<string, number>> = {};
  for (const s of all) for (const [a, h] of Object.entries(s.holder)) (holders[a] ??= {})[h] = ((holders[a] ??= {})[h] ?? 0) + 1;
  out[cfg.name] = {
    runs: RUNS, secondsPerRun: (Date.now() - t0) / 1000 / RUNS,
    rollsPerPhase: sum(s => s.rolls) / sum(s => s.phases),
    maintainShareOfTokens: sum(s => s.maintainTokens) / Math.max(1, sum(s => s.tokens)),
    idleShare: sum(s => s.idleFactionPhases) / Math.max(1, sum(s => s.factionPhasesWithPower)),
    successOpen: sum(s => s.openSuccesses) / Math.max(1, sum(s => s.openRolls)),
    successDefended: sum(s => s.defendedSuccesses) / Math.max(1, sum(s => s.defendedRolls)),
    defendedShareOfRolls: sum(s => s.defendedRolls) / Math.max(1, sum(s => s.rolls)),
    advancesPerCampaign: mean(all.map(s => s.advancesByAct.reduce((a, b) => a + b, 0))),
    advancesByAct: [0, 1, 2].map(i => mean(all.map(s => s.advancesByAct[i]))),
    accomplishedPerCampaign: mean(all.map(s => s.accomplished)), readyPerCampaign: mean(all.map(s => s.ready)),
    reachedByPriority: Object.fromEntries((['Critical', 'Major', 'Minor'] as GoalPriority[]).map(p =>
      [p, sum(s => s.byPriority[p].reached) / Math.max(1, sum(s => s.byPriority[p].goals))])),
    accomplishedByFaction: Object.fromEntries(factions.map(f => [f, mean(all.map(s => s.accomplishedByFaction[f] ?? 0))])),
    powerStart: Object.fromEntries(factions.map(f => [f, mean(all.map(s => s.powerStart[f]))])),
    powerEnd: Object.fromEntries(factions.map(f => [f, mean(all.map(s => s.powerEnd[f] ?? 0))])),
    powerZeroAtEnd: mean(all.map(s => s.powerZeroEnd)),
    attacksOnGuardedTargets: Object.fromEntries((['guardSecret', 'guardKnown'] as const).map(k => [k === 'guardSecret' ? 'secret' : 'known', {
      rollsPerCampaign: sum(s => s[k].rolls) / RUNS, defendedShare: sum(s => s[k].defended) / Math.max(1, sum(s => s[k].rolls)),
      successRate: sum(s => s[k].successes) / Math.max(1, sum(s => s[k].rolls)) }])),
    finalHolders: Object.fromEntries(Object.entries(holders).map(([a, h]) => [a, Object.fromEntries(Object.entries(h).map(([k, v]) => [k, v / RUNS]))])),
  };
  process.stderr.write(`${cfg.name}: ${RUNS} runs in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
}
console.log(JSON.stringify(out, null, 1));
