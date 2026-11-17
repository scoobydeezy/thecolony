// M5/M6 end-to-end Colony Turn test (Session 9: the card's draft-then-confirm flow, POST /colony-turns/complete) against a running server on a COPY of the database (never the live DB).
// It mutates the database: adds Sessions 7–10 (Session 7 only if absent: since §18.10 the campaign starts with no history),
// two crises in Session 7, Colony Turns and World Conditions.
//   cp colony-data/colony.db /tmp/ct/colony.db
//   (cd server && ConnectionStrings__Default='Data Source=/tmp/ct/colony.db' ASPNETCORE_URLS=http://127.0.0.1:5082 dotnet run --no-launch-profile &)
//   sed "s#CLIENT/#$PWD/client/#g" tools/e2e/colony-turn.e2e.ts > /tmp/ct/e2e.ts && client/node_modules/.bin/esbuild /tmp/ct/e2e.ts --bundle --platform=node --outfile=/tmp/ct/e2e.js && node /tmp/ct/e2e.js
import { buildOpeningInputs, buildFactionPhaseInputs, stateAfterTurnEvent, withDraftTurnEvent } from 'CLIENT/src/app/core/sim/colony-turn';
import { resolveOpening, openingEffects } from 'CLIENT/src/app/core/sim/opening';
import { resolveCharacterPhase, characterPhaseEffects } from 'CLIENT/src/app/core/sim/character-phase';
import { buildCharacterPhaseInputs } from 'CLIENT/src/app/core/sim/colony-turn';
import { resolveFactionPhase, factionPhaseEffects, canonicalJson } from 'CLIENT/src/app/core/sim/faction-phase';
import { buildColonySnapshots } from 'CLIENT/src/app/core/sim/replay';
import { evaluateConditions, conditionWorldAt } from 'CLIENT/src/app/core/sim/conditions';
import { createHash } from 'crypto';
import { factionFromApi, characterFromApi, colonyStateFromApi } from 'CLIENT/src/app/core/services/api-mappers';
const B = 'http://127.0.0.1:5082/api';
const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
const j = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const r = await fetch(B + path, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let d: any = t; try { d = JSON.parse(t); } catch {}
  return { status: r.status, data: d };
};
const hv = async () => (await j('GET', '/colony-turns/history-version')).data.historyVersion as number;
const world = async () => {
  const [colonyState, factions, characters, assets, goals, locations, sessions, rules] = await Promise.all(
    ['/colony-state', '/factions', '/characters', '/assets', '/faction-goals', '/locations', '/sessions', '/rules'].map(p => j('GET', p).then(r => r.data)));
  // the same mapping the browser's ApiService applies
  return { colonyState: colonyStateFromApi(colonyState), factions: factions.map(factionFromApi), characters: characters.map(characterFromApi),
           assets, goals, locations, sessions, rules };
};
const ok = (cond: boolean, msg: string) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) process.exitCode = 1; };
const commit = (turn: any, kind: string, inputs: any, results: any, effects: any[], version: number) => {
  const fj = canonicalJson(inputs);
  return j('POST', `/colony-turns/${turn.id}/phases`, { kind, frozenInputsJson: fj, frozenInputsHash: sha(fj), resultsJson: JSON.stringify(results), effects }, { 'If-History-Version': String(version) });
};
(async () => {
  let r0: any;
  let w = await world();
  // goals need no authored text to be nominated (simplified 2026-10-15): none is added here
  // M6 setup: in Session 7's play, a faction leader and an ordinary member enter Compromised (a crisis)
  const s7 = w.sessions.find((s: any) => s.number === 7)
    ?? (await j('POST', '/sessions', { number: 7, title: 'S7 (set-up)', act: 2, week: 7, summary: '', events: [] })).data;
  ok(!!s7?.id, `Session 7 is available for the set-up (${w.sessions.length} sessions in the copied history)`);
  const leaderFaction = w.factions.find((f: any) => f.type === 'Faction' && f.active && f.leaderId && w.characters.find((c: any) => c.id === f.leaderId)?.state === 'Alive');
  const leaderId = leaderFaction.leaderId;
  const member = w.characters.find((c: any) => c.characterType === 'NPC' && c.state === 'Alive' && c.factionId && c.factionId !== leaderFaction.id && c.id !== leaderId
    && w.factions.some((f: any) => f.id === c.factionId && f.type === 'Faction' && f.active));
  r0 = await j('POST', '/events', { sessionId: s7.id, title: 'Crises (test)', sortOrder: 50, effects: [
    { targetType: 'character', targetId: leaderId, property: 'instability', delta: 0, value: 'Compromised' },
    { targetType: 'character', targetId: member.id, property: 'instability', delta: 0, value: 'Compromised' }] });
  ok(r0.status === 201 || r0.status === 200, `S7 play: ${leaderFaction.id} leader and a ${member.factionId} member become Compromised`);
  const s8 = (await j('POST', '/sessions', { number: 8, title: 'S8 (M5 test)', act: 2, week: 8, summary: '', events: [] })).data;
  ok(!!s8.id, 'created Session 8 (Act II)');
  const turn = (await j('POST', '/colony-turns', { sessionId: s8.id, seed: 424242, engineVersion: 'v1-dev' })).data;
  ok(turn.status === 'Draft', 'turn created (Draft)');
  ok((await j('POST', '/colony-turns', { sessionId: s8.id, seed: 1, engineVersion: 'v1-dev' })).status === 409, 'a second turn for the session is refused');

  // Opening
  w = await world(); let v = await hv();
  const oi = buildOpeningInputs(w as any, s8.id, turn.seed);
  const or = resolveOpening(oi), oe = openingEffects(oi, or);
  ok(!('checks' in oi) && oe.every(e => e.targetType !== 'character'), 'Opening (op-4): Momentum only; no Defection Checks (§18.4)');
  console.log('  Opening: pending', oi.pending.length, 'resolutions', or.resolutions.map(r => `${r.factionId} ${r.from}->${r.to}`).join(', ') || 'none');
  ok((await commit(turn, 'Opening', oi, or, oe, v - 1)).status === 409, 'stale history version is refused (409)');
  ok((await commit(turn, 'FactionPhase', oi, or, oe, v)).status === 409, 'a Faction Phase before the Opening is out of order (409)');
  const bad = [...oe, { targetType: 'faction', targetId: 'aspis', property: 'momentumTier', delta: 1, origin: 'MomentumResolution' }];
  ok((await commit(turn, 'Opening', oi, or, bad, v)).status === 422, 'an Opening with an unsupported Momentum change is refused (422)');
  let r = await commit(turn, 'Opening', oi, or, oe, v);
  ok(r.status === 200, `Opening committed (${oe.length} effects)`);
  ok((await j('POST', `/colony-turns/${turn.id}/phases`, { kind: 'Publish', frozenInputsJson: '{}', frozenInputsHash: sha('{}'), resultsJson: '{}', effects: [] }, { 'If-History-Version': String(await hv()) })).status === 409,
     'Publish before the Faction Phase is refused in Act II');

  // Faction Phase
  w = await world(); v = await hv();
  let fb = buildFactionPhaseInputs(w as any, s8.id, turn.seed);
  let fr = resolveFactionPhase(fb.inputs), fe = factionPhaseEffects(fb.inputs, fr);
  console.log(`  Faction Phase: ${fb.inputs.factions.map(f => f.id + ' P' + f.power + ' M' + f.momentum).join(', ')} | eligible ${fb.inputs.goals.length}, ineligible ${fb.ineligible.length}`);
  console.log(`  rolls ${fr.attempts.length}, criticals ${fr.attempts.filter(a => a.signal).length}, advanced ${fr.goals.filter(g => g.outcome !== 'None').map(g => g.outcome).join(', ')}`);
  const tampered = JSON.parse(JSON.stringify(fr)); tampered.attempts[0].d1 = tampered.attempts[0].d1 === 6 ? 5 : 6;
  ok((await commit(turn, 'FactionPhase', fb.inputs, tampered, fe, v)).status === 422, 'app dice the seed did not produce are refused (422)');
  // §18.12 fp-5: guards are active assignments threatened by a known (non-Secret) goal of another faction
  const visOf = (id: string) => w.goals.find((g: any) => g.id === id)?.visibility;
  ok(fb.inputs.version === 'fp-5' && fb.inputs.target === 10 && fb.inputs.guards.every(gd =>
       fb.inputs.goals.some(g => g.factionId !== gd.factionId && g.targetEntityId === gd.targetEntityId && visOf(g.id) !== 'Secret')),
     `fp-5 inputs: DC 10; ${fb.inputs.guards.length} guards, each threatened by a known goal (${fb.inputs.guards.map(g => g.title).join(', ') || 'none'})`);
  console.log(`  posted ${fr.guarding.length} guard(s); ${fr.attempts.filter(a => a.defense).length} roll(s) guarded`);
  r = await commit(turn, 'FactionPhase', fb.inputs, fr, fe, v);
  ok(r.status === 200, `Faction Phase committed (${fe.length} effects)`);
  const fpPhaseId = r.data.phase.id;

  // void and re-run with physical dice
  v = await hv();
  ok((await j('POST', `/colony-turns/${turn.id}/phases/${fpPhaseId}/void`, {}, { 'If-History-Version': String(v) })).status === 200, 'Faction Phase voided');
  w = await world();
  const ctEvent = w.sessions.find((s: any) => s.id === s8.id).events.find((e: any) => e.kind === 'ColonyTurn');
  ok(ctEvent.effects.every((e: any) => e.origin !== 'FactionPhase' && e.origin !== 'GoalGenerator'), 'its Effects were removed; the Opening remains');
  // §18.11: give the goal that will roll first an advance Effect (a marker Location becomes Unstable), then re-run.
  // (2026-10-26: an advance no longer establishes a World Condition; that is refused below.)
  const marker = w.locations[0];
  const establish = [{ targetType: 'location', targetId: marker.id, property: 'state', delta: 0, value: 'Unstable' }];
  const firstGoalId = resolveFactionPhase(buildFactionPhaseInputs(w as any, s8.id, turn.seed).inputs).attempts[0].goalId;
  const firstGoal = w.goals.find((g: any) => g.id === firstGoalId);
  const advanceAt = firstGoal.status === 'Plotting' ? 'progressing' : firstGoal.outcomeMode !== 'Adjudicated' ? 'accomplished' : null;
  if (advanceAt) {
    r = await j('PUT', `/faction-goals/${firstGoal.id}`, { ...firstGoal, [`${advanceAt}EffectsJson`]: JSON.stringify(establish) });
    ok(r.status === 200, `a goal stores advance Effects (${firstGoal.title}, at ${advanceAt})`);
    w = await world();
  }
  ok((await j('PUT', `/faction-goals/${firstGoal.id}`, { ...firstGoal, progressingEffectsJson: '[{"targetType":"asset","targetId":"x","property":"tier","delta":1}]' })).status === 400,
     'a goal with an Effect outside the advance vocabulary is refused (400)');
  ok((await j('PUT', `/faction-goals/${firstGoal.id}`, { ...firstGoal, accomplishedEffectsJson: '[{"targetType":"condition","targetId":"x","property":"state","delta":0,"value":"Active"}]' })).status === 400,
     'a goal whose advance would establish a World Condition is refused (400): conditions follow the goal\'s stage instead');
  v = await hv(); fb = buildFactionPhaseInputs(w as any, s8.id, turn.seed);
  const first = resolveFactionPhase(fb.inputs).attempts[0];
  fr = resolveFactionPhase(fb.inputs, { [first.id]: [6, 6] }); fe = factionPhaseEffects(fb.inputs, fr);
  r = await commit(turn, 'FactionPhase', fb.inputs, fr, fe, v);
  ok(r.status === 200 && fr.attempts[0].degree === 'CriticalSuccess', 're-run with a physical 6+6: Critical Success committed');
  if (advanceAt) {
    const committed = (await world()).sessions.find((s: any) => s.id === s8.id).events.find((e: any) => e.kind === 'ColonyTurn').effects;
    const fx = committed.find((e: any) => e.targetType === 'location' && e.targetId === marker.id && e.origin === 'GoalGenerator');
    ok(!!fx && fx.actorFactionId === firstGoal.factionId && fx.value === 'Unstable',
       `fp-4/5: the advance Effect is committed with the turn and verified by the server (${marker.name} → Unstable, credited to ${firstGoal.factionId})`);
  }

  // Publish is refused until the Character Phase
  ok((await j('POST', `/colony-turns/${turn.id}/phases`, { kind: 'Publish', frozenInputsJson: '{}', frozenInputsHash: sha('{}'), resultsJson: '{}', effects: [] }, { 'If-History-Version': String(await hv()) })).status === 409,
     'Publish before the Character Phase is refused');
  // Character Phase
  w = await world(); v = await hv();
  const ci = buildCharacterPhaseInputs(w as any, s8.id, turn.seed);
  ok([leaderId, member.id].every(id => ci.checks.some(c => c.characterId === id)),   // plus any crisis already in the copied campaign
     `Character Phase: ${ci.checks.length} Defection Checks, including both set-up crises (labels ${ci.checks.map(c => c.label).join(', ')})`);
  const cr = resolveCharacterPhase(ci, { [leaderId]: [6, 6], [member.id]: [1, 1] }), ce = characterPhaseEffects(cr);
  ok(cr.checks.find(c => c.characterId === leaderId)!.left && !cr.checks.find(c => c.characterId === member.id)!.left, 'table dice: the leader leaves, the member stays');
  console.log(`  Character Phase: ${ci.characters.length} members; rolls ${cr.rolls.map(x => x.factionId + ':' + x.from + '->' + x.to).join(', ')}; skipped ${cr.skipped.map(x => x.factionId + ' ' + x.reason).join(', ')}`);
  ok(cr.skipped.some(x => x.factionId === leaderFaction.id && x.reason === 'consumed') && cr.skipped.some(x => x.factionId === member.factionId && x.reason === 'consumed'),
     'both checked factions have used their Character Phase roll');
  ok(new Set(cr.rolls.map(x => x.factionId)).size === cr.rolls.length, 'at most one Drift Roll per faction');
  const forged = JSON.parse(JSON.stringify(cr)); if (forged.rolls[0]) forged.rolls[0].d1 = forged.rolls[0].d1 === 6 ? 5 : 6;
  if (cr.rolls.length) ok((await commit(turn, 'CharacterPhase', ci, forged, ce, v)).status === 422, 'forged Drift Roll dice are refused (422)');
  const appCheck = cr.checks.findIndex(c => c.source === 'app');
  if (appCheck >= 0) {
    const forgedCheck = JSON.parse(JSON.stringify(cr)); forgedCheck.checks[appCheck].d1 = forgedCheck.checks[appCheck].d1 === 6 ? 5 : 6;
    ok((await commit(turn, 'CharacterPhase', ci, forgedCheck, ce, v)).status === 422, 'forged Defection Check dice are refused (422)');
  }
  r = await commit(turn, 'CharacterPhase', ci, cr, ce, v);
  ok(r.status === 200, `Character Phase committed (${ce.length} effects)`);

  // Publish
  v = await hv();
  const pb = { version: 'pb-1', sessionId: s8.id }; const pj = canonicalJson(pb);
  r = await j('POST', `/colony-turns/${turn.id}/phases`, { kind: 'Publish', frozenInputsJson: pj, frozenInputsHash: sha(pj), resultsJson: '{}', effects: [] }, { 'If-History-Version': String(v) });
  ok(r.status === 200, 'published');
  const t2 = (await j('GET', `/colony-turns/${turn.id}`)).data;
  ok(t2.status === 'Committed', 'turn Committed');
  ok((await j('POST', `/colony-turns/${turn.id}/void`, {}, { 'If-History-Version': String(await hv()) })).status === 409, 'a committed turn cannot be voided');
  ok((await j('DELETE', `/events/${ctEvent.id}`)).status === 409, 'the Colony Turn event cannot be deleted');

  // replay: the committed turn is folded
  w = await world();
  const ss = [...w.sessions].sort((a: any, b: any) => a.number - b.number);
  const snaps = buildColonySnapshots(w.colonyState, w.factions, w.characters, ss, w.rules, w.assets, w.goals, w.locations);
  const last = snaps.at(-1)!;
  const crit = fr.attempts.filter(a => a.signal);
  ok(crit.every(a => last.pendingMomentumSignals.some(s => s.rootCauseId === a.id && s.rule === (a.signal > 0 ? 'critical-success' : 'critical-failure'))),
     `replay: ${crit.length} critical signal(s) pending for the next Opening`);
  const adv = fr.goals.filter(g => g.outcome === 'Progressing' || g.outcome === 'Accomplished');
  ok(adv.every(g => last.goalStatuses[g.goalId] === (g.outcome === 'Progressing' ? 'Progressing' : 'Accomplished')), `replay: ${adv.length} goal advance(s) folded`);
  const ready = fr.goals.filter(g => g.outcome === 'ReadyToResolve');
  ok(ready.every(g => !!last.goalReady[g.goalId]), `replay: ${ready.length} Ready to Resolve overlay(s)`);
  const tiersAfter = stateAfterTurnEvent(w as any, s8.id)!.factionMomentumTier;
  ok(or.resolutions.every(x => tiersAfter[x.factionId] === x.to), 'replay: Momentum after the Opening equals the committed resolution');
  ok(last.characterFactions[leaderId] === undefined && last.factionLeaders[leaderFaction.id] === null && last.characterInstability[leaderId] === 'Stable',
     'replay: the defector has no faction, is Stable, and the faction is leaderless');
  ok(last.characterInstability[member.id] === 'Conflicted', 'replay: the member who stayed is Conflicted');
  ok(last.factionMomentumTier[leaderFaction.id] === tiersAfter[leaderFaction.id], 'replay: the leader leaving does not change Momentum this Turn');
  ok(last.pendingMomentumSignals.filter(sg => sg.rule === 'leader-left' && sg.factionId === leaderFaction.id).length === 1,
     'replay: the leader leaving is one −1 signal, pending for the next Opening');
  ok(last.lastCharacterPhaseSession === 8, 'replay: the Character Phase marker is recorded');

  // Session 9: the whole turn drafted on the client (as the Colony Turn card does) and confirmed at once
  const s9 = (await j('POST', '/sessions', { number: 9, title: 'S9 (M5 test)', act: 3, week: 9, summary: '', events: [] })).data;
  w = await world(); v = await hv();
  const seed9 = 99;
  const oi9 = buildOpeningInputs(w as any, s9.id, seed9), or9 = resolveOpening(oi9), oe9 = openingEffects(oi9, or9);
  console.log('  S9 Opening: pending', oi9.pending.map(p => p.factionId + (p.sign > 0 ? '+1' : '-1') + ' ' + p.rule).join(', '),
              '| resolutions', or9.resolutions.map(r => `${r.factionId} ${r.from}->${r.to}`).join(', '));
  ok(crit.every(a => oi9.pending.some(p => p.rootCauseId === a.id)), 'S9 Opening sees the S8 criticals as pending signals');
  ok(or9.resolutions.some(x => x.factionId === leaderFaction.id && x.signals.some(sg => sg.rule === 'leader-left')),
     'S9 Opening resolves the S8 leader departure');
  const fb9 = buildFactionPhaseInputs(withDraftTurnEvent(w as any, s9.id, oe9 as any), s9.id, seed9);
  // §18.5: the card re-rolls dice ('reroll') and the GM accepts a Ready to Resolve goal during the Turn
  const first9 = resolveFactionPhase(fb9.inputs).attempts[0];
  const reroll9 = first9 ? { [first9.id]: [6, 6] as [number, number] } : {};
  const ready9 = resolveFactionPhase(fb9.inputs, reroll9, { overrideSource: 'reroll' }).goals.filter(g => g.outcome === 'ReadyToResolve').map(g => g.goalId);
  const fr9 = resolveFactionPhase(fb9.inputs, reroll9, { overrideSource: 'reroll', accepted: ready9.slice(0, 1) }), fe9 = factionPhaseEffects(fb9.inputs, fr9);
  console.log(`  S9 Faction Phase: ${fr9.attempts.length} rolls, re-rolled ${fr9.attempts.filter(a => a.source === 'reroll').length}, Ready ${ready9.length}, accepted ${fr9.accepted.join(', ') || 'none'}`);
  const ci9 = buildCharacterPhaseInputs(withDraftTurnEvent(w as any, s9.id, [...oe9, ...fe9] as any), s9.id, seed9);
  const cr9 = resolveCharacterPhase(ci9), ce9 = characterPhaseEffects(cr9);
  const phase = (kind: string, inputs: any, results: any, effects: any[]) => {
    const fj = canonicalJson(inputs); return { kind, frozenInputsJson: fj, frozenInputsHash: sha(fj), resultsJson: JSON.stringify(results), effects };
  };
  const phases9 = [phase('Opening', oi9, or9, oe9), phase('FactionPhase', fb9.inputs, fr9, fe9), phase('CharacterPhase', ci9, cr9, ce9)];
  const complete = (phases: any[], version: number) => j('POST', '/colony-turns/complete', { sessionId: s9.id, seed: seed9, engineVersion: 'v1-dev', phases }, { 'If-History-Version': String(version) });
  const nothingWritten = async () => {
    const t = (await j('GET', '/colony-turns')).data.filter((t: any) => t.sessionId === s9.id);
    const ev = (await world()).sessions.find((s: any) => s.id === s9.id).events.filter((e: any) => e.kind === 'ColonyTurn');
    return t.length === 0 && ev.every((e: any) => e.effects.length === 0);
  };
  ok((await complete(phases9, v - 1)).status === 409 && await nothingWritten(), 'complete: a stale history version is refused and nothing is written');
  const forged9 = JSON.parse(JSON.stringify(fr9)); if (forged9.attempts[0]) forged9.attempts[0].d1 = forged9.attempts[0].d1 === 6 ? 5 : 6;
  if (fr9.attempts.length)
    ok((await complete([phases9[0], phase('FactionPhase', fb9.inputs, forged9, fe9), phases9[2]], v)).status === 422 && await nothingWritten(),
       'complete: a forged Faction Phase is refused (422) and nothing is written, not even the valid Opening');
  ok((await complete([phases9[0], phases9[2]], v)).status === 409 && await nothingWritten(), 'complete: Act III without a Faction Phase is refused and nothing is written');
  ok((await complete([...phases9, phase('Publish', {}, {}, [])], v)).status === 400, 'complete: Publish is the server\'s to add');
  r = await complete(phases9, v);
  ok(r.status === 200 && r.data.turn.status === 'Committed', `complete: S9 committed in one request (${oe9.length + fe9.length + ce9.length} effects)`);
  const t9 = (await j('GET', '/colony-turns')).data.find((t: any) => t.sessionId === s9.id);
  ok(t9.phases.map((p: any) => p.kind).join() === 'Opening,FactionPhase,CharacterPhase,Publish', 'complete: four phases recorded, Publish added by the server');
  ok((await complete(phases9, await hv())).status === 409, 'complete: a second turn for the session is refused');
  w = await world();
  const after9 = stateAfterTurnEvent(w as any, s9.id)!;
  ok(or9.resolutions.every(x => after9.factionMomentumTier[x.factionId] === x.to), 'replay: S9 Momentum equals its committed Opening');
  // the committed history as each phase saw it in the phase-by-phase flow: the turn's event holding only earlier phases' Effects
  const upTo = (kinds: string[]) => {
    const ids = new Set(t9.phases.filter((p: any) => kinds.includes(p.kind)).map((p: any) => p.id));
    return { ...w, sessions: w.sessions.map((s: any) => s.id !== s9.id ? s : { ...s, events: s.events.map((e: any) =>
      e.kind !== 'ColonyTurn' ? e : { ...e, effects: e.effects.filter((ef: any) => ids.has(ef.phaseId)) }) }) };
  };
  ok(canonicalJson(buildFactionPhaseInputs(upTo(['Opening']) as any, s9.id, seed9).inputs) === canonicalJson(fb9.inputs)
     && canonicalJson(buildCharacterPhaseInputs(upTo(['Opening', 'FactionPhase']) as any, s9.id, seed9)) === canonicalJson(ci9),
     'the drafted Faction and Character Phase inputs equal those rebuilt from the committed history');
  const evs9 = w.sessions.find((s: any) => s.id === s9.id).events.filter((e: any) => e.kind === 'ColonyTurn');
  if (fr9.accepted.length) {
    const g = fr9.accepted[0], end9 = buildColonySnapshots(w.colonyState, w.factions, w.characters, [...w.sessions].sort((a: any, b: any) => a.number - b.number), w.rules, w.assets, w.goals, w.locations).at(-1)!;
    ok(end9.goalStatuses[g] === 'Accomplished' && !end9.goalReady[g], 'an accepted resolution is Accomplished by the Turn, with no task left for the session');
  }
  ok(t9.phases.some((p: any) => p.kind === 'FactionPhase' && p.resultsJson.includes('"source":"reroll"')) || !first9, 'a re-rolled die is recorded as a re-roll');
  ok(evs9.length === 1 && evs9[0].effects.map((e: any) => e.ordinal).join() === evs9[0].effects.map((_: any, i: number) => i).join(), 'one Colony Turn event; effect ordinals 0…n−1 in phase order');

  // §18.6: a Faction Phase in Act I, Earliest Act gating, Power 0–3, World Conditions
  const s10 = (await j('POST', '/sessions', { number: 10, title: 'S10 (Act I check)', act: 1, week: 10, summary: '', events: [] })).data;
  w = await world();
  ok(w.goals.filter((g: any) => g.conditionType === 'Achieve').every((g: any) => [1, 2, 3].includes(g.earliestAct)), 'every Achieve goal has an Earliest Act (I–III; the migration default is II)');
  const promote = w.goals.find((g: any) => g.conditionType === 'Achieve' && !['Accomplished', 'Failed', 'Retired'].includes(g.status)
    && fb9.inputs.goals.some(x => x.id === g.id));
  await j('PUT', `/faction-goals/${promote.id}`, { ...promote, earliestAct: 1 });
  w = await world(); v = await hv();
  const oi10 = buildOpeningInputs(w as any, s10.id, 7), or10 = resolveOpening(oi10), oe10 = openingEffects(oi10, or10);
  const fb10 = buildFactionPhaseInputs(withDraftTurnEvent(w as any, s10.id, oe10 as any), s10.id, 7);
  ok(fb10.inputs.goals.length >= 0 && fb10.inputs.goals.every(g => w.goals.find((x: any) => x.id === g.id).earliestAct <= 1),
     `Act I Faction Phase: only Earliest Act I goals are eligible (${fb10.inputs.goals.length}); the rest say "Not yet eligible"`);
  ok(fb10.ineligible.some(x => x.reasons.some(r => r.startsWith('Not yet eligible (from Act II)'))), 'Act II goals are listed as not yet eligible in Act I');
  ok(fb10.inputs.factions.every(f => f.power >= 0 && f.power <= 3), `Power is 0–3: ${fb10.inputs.factions.map(f => f.id + ' ' + f.power).join(', ')}`);
  const fr10 = resolveFactionPhase(fb10.inputs), fe10 = factionPhaseEffects(fb10.inputs, fr10);
  ok(fr10.allocations.every(a => fb10.inputs.factions.find(f => f.id === a.factionId)!.power > 0), 'a faction with Power 0 allocates nothing');
  const ci10 = buildCharacterPhaseInputs(withDraftTurnEvent(w as any, s10.id, [...oe10, ...fe10] as any), s10.id, 7);
  const cr10 = resolveCharacterPhase(ci10), ce10 = characterPhaseEffects(cr10);
  const phases10 = [phase('Opening', oi10, or10, oe10), phase('FactionPhase', fb10.inputs, fr10, fe10), phase('CharacterPhase', ci10, cr10, ce10)];
  r = await j('POST', '/colony-turns/complete', { sessionId: s10.id, seed: 7, engineVersion: 'v1-dev', phases: phases10 }, { 'If-History-Version': String(v) });
  ok(r.status === 200, 'an Act I Colony Turn with a Faction Phase is accepted');
  r = await j('POST', '/colony-turns/complete', { sessionId: s10.id, seed: 7, engineVersion: 'v1-dev', phases: [phases10[0], phases10[2]] }, { 'If-History-Version': String(await hv()) });
  ok(r.status === 409, 'every Act now needs its Faction Phase (and the session already has a turn)');

  // §18.9 World Conditions: CRUD, requirements (Asset controller, Location state, another condition), an Event that
  // establishes one, and Stress contributions folded into the snapshot's Colony Stress
  const reg = w.assets.find((a: any) => /Claims Registry/.test(a.name));
  const site = w.locations[0];
  const c1 = (await j('POST', '/world-conditions', { title: 'Registry intelligence', rule: 'Cult-related Veiled incursions +1 Class (max V)', activeAtStart: true,
    requirementsJson: JSON.stringify([{ kind: 'assetController', assetId: reg.id, factionId: 'cult' }]), stressContribution: 0, sortOrder: 0 })).data;
  const c2 = (await j('POST', '/world-conditions', { title: 'Totality (test)', rule: 'The eclipse is total', activeAtStart: false,
    requirementsJson: '[]', stressContribution: 1, sortOrder: 1 })).data;
  const c3 = (await j('POST', '/world-conditions', { title: 'Breach under Totality (test)', rule: 'Incursions at the site are Class +1', activeAtStart: true,
    requirementsJson: JSON.stringify([{ kind: 'condition', conditionId: c2.id, inForce: true }, { kind: 'locationState', locationId: site.id, states: ['ActiveIncursion'] }]),
    stressContribution: 2, sortOrder: 2 })).data;
  ok(!!c1.id && !!c2.id && !!c3.id && c3.stressContribution === 2 && JSON.parse(c3.requirementsJson).length === 2, 'World Conditions are created with requirements and a Stress contribution');
  r = await j('PUT', `/world-conditions/${c2.id}`, { ...c2, requirementsJson: JSON.stringify([{ kind: 'condition', conditionId: c2.id, inForce: true }]) });
  ok(r.status === 400, 'a condition cannot require itself');
  r = await j('POST', '/events', { sessionId: s10.id, title: 'Registry seized; Totality; the site breached (test)', sortOrder: 60, effects: [
    { targetType: 'asset', targetId: reg.id, property: 'controllingFactionId', delta: 0, value: 'cult', actorFactionId: 'cult' },
    { targetType: 'condition', targetId: c2.id, property: 'state', delta: 0, value: 'Active' },
    { targetType: 'location', targetId: site.id, property: 'state', delta: 0, value: 'ActiveIncursion' },
    { targetType: 'colony', targetId: 'colony', property: 'stress', delta: 4 }] });   // §18.10: a legacy Stress Effect is inert
  ok(r.status === 201 || r.status === 200, 'an Event transfers the Registry, establishes Totality and breaches a Location');
  w = await world();
  const conds = (await j('GET', '/world-conditions')).data;
  const snaps10 = buildColonySnapshots(w.colonyState, w.factions, w.characters, [...w.sessions].sort((a: any, b: any) => a.number - b.number), w.rules, w.assets, w.goals, w.locations, conds);
  const end = snaps10.at(-1)!, before = snaps10.at(-2)!;
  const ev = (snap: any) => evaluateConditions(conds, conditionWorldAt(snap, w as any), { asset: (id: string) => id, faction: (id: string) => id });
  ok(!ev(before).get(c1.id)!.inForce && ev(end).get(c1.id)!.inForce, 'the Registry modifier comes into force when the Cult takes the Registry');
  ok(ev(end).get(c2.id)!.inForce && ev(end).get(c2.id)!.reason.startsWith('established in Session 10'), 'the Event-established condition is in force, with its provenance');
  ok(!ev(before).get(c3.id)!.inForce && ev(end).get(c3.id)!.inForce, 'a condition on Totality and a Location in Active Incursion comes into force with both');
  ok(before.colonyStress === 0 && end.colonyStress === 3 && end.stressFromConditions.map((p: any) => p.stress).sort().join() === '1,2'
     && end.stressFromConditions.every((p: any) => p.origin),
     `§18.10 Colony Stress is only the conditions in force: ${before.colonyStress} → ${end.colonyStress} (${end.stressFromConditions.map((p: any) => `${p.title} +${p.stress}, ${p.origin}`).join('; ')}); the Stress Effect adds nothing`);
  const rulesNow = (await j('GET', '/rules')).data;
  ok(typeof rulesNow.cascadeRulesJson === 'string' && typeof rulesNow.stressTriggersJson === 'string' && !('colonyStress' in w.colonyState),
     'retired configuration is kept for reference (Cascade Rules, Stress Triggers); no stored Colony Stress');
  ok((await j('DELETE', `/world-conditions/${c2.id}`)).status === 204, 'a World Condition can be deleted');
  const after = (await j('GET', '/world-conditions')).data;
  ok(!evaluateConditions(after, conditionWorldAt(end, w as any), { asset: (id: string) => id, faction: (id: string) => id }).get(c3.id)!.inForce,
     'a requirement on a deleted condition never holds');

  // Import ids: a create keeps a supplied id that is free (so a file's rows can reference each other); a taken one gets a new id
  const fixedId = `e2e-asset-${Date.now()}`;
  const a1 = (await j('POST', '/assets', { id: fixedId, name: 'E2E fixed id', type: 'Artifact', role: 'Covert', tier: 1, status: 'Stable', keystone: false })).data;
  const a2 = (await j('POST', '/assets', { id: fixedId, name: 'E2E duplicate id', type: 'Artifact', role: 'Covert', tier: 1, status: 'Stable', keystone: false })).data;
  ok(a1.id === fixedId && a2.id !== fixedId && !!a2.id, 'an imported Asset keeps its id; a duplicate id is given a fresh one');
  await j('DELETE', `/assets/${a1.id}`); await j('DELETE', `/assets/${a2.id}`);

  // §18.8: one active assignment per champion (server), and Faction Size
  const gs = (await j('GET', '/faction-goals')).data;
  const active = (g: any) => !['Accomplished', 'Failed', 'Retired'].includes(g.status);
  const loads = new Map<string, any[]>();
  for (const g of gs.filter((g: any) => g.championId && active(g))) loads.set(g.championId, [...(loads.get(g.championId) ?? []), g]);
  const dup = [...loads.values()].find(l => l.length > 1);
  if (dup) {
    r = await j('PUT', `/faction-goals/${dup[0].id}`, { ...dup[0], title: dup[0].title + ' (edited)' });
    ok(r.status === 200, `an unrelated edit to a legacy duplicate assignment succeeds (${dup[0].title})`);
    await j('PUT', `/faction-goals/${dup[0].id}`, { ...dup[0] });
  }
  const busy = gs.find((g: any) => g.championId && active(g));
  const free = gs.find((g: any) => active(g) && g.id !== busy.id && g.championId !== busy.championId);
  r = await j('PUT', `/faction-goals/${free.id}`, { ...free, championId: busy.championId });
  ok(r.status === 409 && /already champions/.test(r.data), 'reassigning a champion who holds another active assignment is refused (409)');
  r = await j('POST', '/faction-goals', { ...busy, id: '', title: 'Duplicate (test)', championId: busy.championId });
  ok(r.status === 409, 'creating a goal with a busy champion is refused (409)');
  r = await j('POST', '/faction-goals', { ...busy, id: '', title: 'Unassigned (test)', championId: null });
  ok(r.status === 201, 'an unassigned goal is accepted');
  const unassigned = r.data;
  r = await j('PUT', `/faction-goals/${busy.id}`, { ...busy, status: 'Retired', championId: null });
  ok(r.status === 200, 'retiring a goal (its champion unassigned) succeeds');
  r = await j('PUT', `/faction-goals/${unassigned.id}`, { ...unassigned, championId: busy.championId });
  ok(r.status === 200, 'the released champion can now take another assignment');
  const fac0 = (await j('GET', '/factions')).data.find((f: any) => f.id === leaderFaction.id);
  ok(typeof fac0.factionSize === 'number' && !('additionalMemberCount' in fac0), `factions carry factionSize (${fac0.factionSize}); the old column is renamed`);
  r = await j('POST', '/events', { sessionId: s10.id, title: 'Recruitment (test)', sortOrder: 70, effects: [
    { targetType: 'faction', targetId: leaderFaction.id, property: 'factionSize', delta: 120 }] });
  w = await world();
  const endSize = buildColonySnapshots(w.colonyState, w.factions, w.characters, [...w.sessions].sort((a: any, b: any) => a.number - b.number), w.rules, w.assets, w.goals, w.locations).at(-1)!.factionSize[leaderFaction.id];
  ok(endSize === fac0.factionSize + 120, `a Faction Size Effect replays (${fac0.factionSize} → ${endSize})`);
})();
