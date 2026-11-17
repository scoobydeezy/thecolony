// M5 cross-language vectors: the client engine's outputs, which server.Tests/ColonyTurnEngineTests.cs must verify.
// Regenerate after changing either engine (from colony-tracker/):
//   sed "s#CLIENT/#$PWD/client/#g" server.Tests/Vectors/generate.ts > /tmp/v.ts && client/node_modules/.bin/esbuild /tmp/v.ts --bundle --platform=node --outfile=/tmp/v.js && node /tmp/v.js server.Tests/Vectors
import * as fs from 'fs';
import { resolveFactionPhase, factionPhaseEffects, canonicalJson, PRIORITY_BONUS, FactionPhaseInputs } from 'CLIENT/src/app/core/sim/faction-phase';
import { resolveOpening, openingEffects, OpeningInputs } from 'CLIENT/src/app/core/sim/opening';
import { resolveCharacterPhase, characterPhaseEffects, CharacterPhaseInputs, BAND_MODIFIERS, DEFECTION_MODIFIERS } from 'CLIENT/src/app/core/sim/character-phase';
import { mulberry32 } from 'CLIENT/src/app/core/sim/prng';
const r = mulberry32(2026);
const pick = <T,>(xs: T[]) => xs[r() % xs.length];
const PR = ['Critical', 'Major', 'Minor'] as const;
const fp: any[] = [];
for (let n = 0; n < 60; n++) {
  const ADVANCE = [
    { targetType: 'asset', targetId: 'ledger', property: 'status', delta: 0, value: 'Contested' },
    { targetType: 'asset', targetId: 'a1', property: 'controllingFactionId', delta: 0, value: '' },
    { targetType: 'faction', targetId: 'cult', property: 'factionSize', delta: -30 },
    { targetType: 'location', targetId: 'rest', property: 'state', delta: 0, value: 'ActiveIncursion' },
    { targetType: 'condition', targetId: 'wc1', property: 'state', delta: 0, value: 'Active' },
  ];
  const factions = ['aspis', 'cult', 'keepers', 'shattered'].map(id => ({ id, name: id.toUpperCase(), power: 1 + r() % 3, momentum: (r() % 5) - 2 }));
  const goals: any[] = [];
  for (const f of factions) for (let k = 0; k < 1 + r() % 4; k++) {
    const t = r() % 4;
    goals.push({ id: `${f.id}-g${k}`, factionId: f.id, title: `${f.name} goal ${k}`, priority: pick([...PR]), status: pick(['Plotting', 'Progressing']),
      outcomeMode: t === 3 ? 'Adjudicated' : 'Automatic',
      ...(t === 0 ? { targetEntityType: 'Asset', targetEntityId: 'ledger', targetOwnerFactionId: f.id } :
          t === 1 ? { targetEntityType: 'Asset', targetEntityId: `a${r() % 3}`, targetState: 'Destroyed' } :
          t === 2 ? { targetEntityType: 'Character', targetEntityId: 'vara', targetState: 'Dead' } : {}),
      // fp-4: advance Effects on some goals (any vocabulary: status, control, Faction Size, Location state, condition)
      ...(r() % 2 === 0 ? { onProgressing: [pick(ADVANCE)] } : {}),
      ...(r() % 3 === 0 ? { onAccomplished: [pick(ADVANCE), pick(ADVANCE)] } : {}) });
  }
  goals.sort((a, b) => a.id < b.id ? -1 : 1);
  // fp-5 guards: 0–4 assignments on targets the goals use (some by the attacker's own faction, which never defend it)
  const guards = Array.from({ length: r() % 5 }, (_, k) => ({ id: `guard-${k}`, factionId: pick(factions).id, title: `Guard ${k}`,
    priority: pick([...PR]), targetEntityId: pick(['ledger', 'a0', 'a1', 'a2', 'vara']) }));
  const inputs: FactionPhaseInputs = { version: 'fp-5', seed: r(), target: 8 + r() % 4, priorityBonus: { ...PRIORITY_BONUS }, factions, goals, guards };
  const physical: any = {};
  if (n % 3 === 0) { const first = resolveFactionPhase(inputs).attempts[0]; if (first) physical[first.id] = [1 + r() % 6, 1 + r() % 6]; }
  // §18.5: some overrides are app re-rolls; the GM accepts every other Ready to Resolve goal
  const overrideSource = n % 2 === 0 ? 'reroll' as const : 'physical' as const;
  const ready = resolveFactionPhase(inputs, physical, { overrideSource }).goals.filter(g => g.outcome === 'ReadyToResolve').map(g => g.goalId);
  const res = resolveFactionPhase(inputs, physical, { overrideSource, accepted: ready.filter((_, i) => i % 2 === 0) });
  fp.push({ inputs: canonicalJson(inputs), results: JSON.stringify(res), effects: factionPhaseEffects(inputs, res) });
}
const op: any[] = [];
for (let n = 0; n < 40; n++) {
  const fs_ = ['aspis', 'cult', 'keepers'];
  const tiers = Object.fromEntries(fs_.map(f => [f, (r() % 5) - 2]));
  const pending = Array.from({ length: r() % 6 }, (_, i) => ({ factionId: pick(fs_), sign: r() % 2 ? 1 : -1, rule: pick(['critical-success', 'leader-left']), rootCauseId: `root${r() % 3}`, sourceSessionId: 's', reason: `reason ${i}` }));
  const inputs: OpeningInputs = { version: 'op-4', seed: r(), tiers, pending: pending as any };
  const res = resolveOpening(inputs);
  op.push({ inputs: canonicalJson(inputs), results: JSON.stringify(res), effects: openingEffects(inputs, res) });
}
const cp: any[] = [];
const labels = Object.keys(DEFECTION_MODIFIERS) as (keyof typeof DEFECTION_MODIFIERS)[];
for (let n = 0; n < 60; n++) {
  const factions = ['aspis', 'cult', 'keepers', 'shattered'];
  const characters = Array.from({ length: 2 + r() % 8 }, (_, i) => ({ id: `ch${i}`, name: pick(['Ana', 'Bo', 'Cy', 'Di']) + i % 2, factionId: pick(factions),
    instability: pick(['Stable', 'Stable', 'Conflicted', 'Compromised'] as const), drift: Math.round(((r() % 6000) / 100 - 15) * 100) / 100,
    exempt: r() % 6 === 0, reaffirmed: r() % 7 === 0 }));
  // every Compromised member makes a Defection Check (as the builder does)
  const checks = characters.filter(c => c.instability === 'Compromised').map(c => { const label = pick(labels);
    return { characterId: c.id, name: c.name, factionId: c.factionId, label, modifier: DEFECTION_MODIFIERS[label], isLeader: r() % 3 === 0 }; });
  const inputs: CharacterPhaseInputs = { version: 'cp-2', seed: r(), target: 8, waveringAt: 15, breakingAt: 30, bandModifiers: { ...BAND_MODIFIERS },
    defectionTarget: 8, checks, factions, characters };
  let res = resolveCharacterPhase(inputs);
  const phys: Record<string, [number, number]> = {};
  if (n % 4 === 0 && res.rolls.length) phys[res.rolls[0].characterId] = [1 + r() % 6, 1 + r() % 6];
  if (n % 5 === 0 && checks.length) phys[checks[0].characterId] = [1 + r() % 6, 1 + r() % 6];
  if (Object.keys(phys).length) res = resolveCharacterPhase(inputs, phys, { overrideSource: n % 2 === 0 ? 'reroll' : 'physical' });
  cp.push({ inputs: canonicalJson(inputs), results: JSON.stringify(res), effects: characterPhaseEffects(res) });
}
fs.writeFileSync(process.argv[2] + '/character-phase.json', JSON.stringify(cp));
console.log('character phases', cp.length, 'rolls', cp.reduce((s, v) => s + JSON.parse(v.results).rolls.length, 0),
            'settled', cp.reduce((s, v) => s + JSON.parse(v.results).settled.length, 0),
            'checks', cp.reduce((s, v) => s + JSON.parse(v.results).checks.length, 0),
            'left', cp.reduce((s, v) => s + JSON.parse(v.results).checks.filter((c: any) => c.left).length, 0));
const crits = fp.reduce((s, v) => s + JSON.parse(v.results).attempts.filter((a: any) => a.signal).length, 0);
const coll = fp.reduce((s, v) => s + JSON.parse(v.results).goals.filter((g: any) => g.preempted).length, 0);
fs.writeFileSync(process.argv[2] + '/faction-phase.json', JSON.stringify(fp));
fs.writeFileSync(process.argv[2] + '/opening.json', JSON.stringify(op));
const acc = fp.reduce((s, v) => s + JSON.parse(v.results).accepted.length, 0);
const rer = fp.reduce((s, v) => s + JSON.parse(v.results).attempts.filter((a: any) => a.source === 'reroll').length, 0);
console.log('faction phases', fp.length, 'criticals', crits, 'preempted', coll, 'accepted', acc, 'rerolls', rer, 'openings', op.length);
