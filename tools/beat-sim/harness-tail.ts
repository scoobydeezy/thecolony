import * as fs from 'fs';
const D = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const snaps = buildColonySnapshots(D.colonyState, D.factions, D.characters, D.sessions, D.rules, D.assets, D.goals, D.locations);
const F = { ...DEFAULT_FORMULAS, ...JSON.parse(D.rules.formulasJson || '{}') };
const svc = new (FactionInfluenceService as any)();
const fx = D.factions.filter((f: any) => f.type === 'Faction');
const out: any = { sessions: [], powerVariants: {} };
for (const s of snaps) {
  out.sessions.push({ n: s.sessionNumber, stress: s.colonyStress,
    momentum: Object.fromEntries(fx.map((f: any) => [f.id, s.factionMomentum[f.id]])),
    baseLeg: Object.fromEntries(fx.map((f: any) => [f.id, s.factionBaseLegitimacy[f.id]])),
    derived: s.derivedEffects.map((d: any) => `${d.ruleLabel}: ${d.sourceEntityId} ${d.targetProperty} ${d.delta}`),
    goalChanges: Object.entries(s.goalStatuses).filter(([k, v]) => D.goals.find((g: any) => g.id === k).status !== v).map(([k, v]) => `${D.goals.find((g: any) => g.id === k).title} -> ${v}`),
  });
}
const last = snaps[snaps.length - 1];
const viewF = (f: any) => ({ ...f, momentum: last.factionMomentum[f.id], baseLegitimacy: last.factionBaseLegitimacy[f.id], powerModifier: last.factionPowerModifier[f.id] });
const viewC = D.characters.map((c: any) => ({ ...c, pressure: last.characterPressure[c.id], influence: last.characterInfluence[c.id], state: last.characterStates[c.id], factionId: last.characterFactions[c.id] }));
const viewA = D.assets.map((a: any) => ({ ...a, controllingFactionId: last.assetControl[a.id], status: last.assetStatuses[a.id] }));
for (const f of fx) {
  const vf = viewF(f);
  const detail = svc.calculateEffectivePower(vf, viewC.filter((c: any) => c.state === 'Alive' && (c.factionId === f.id || c.socialClassId === f.id)), F, viewA);
  const dashboard = svc.calculateEffectivePower(vf, viewC.filter((c: any) => c.factionId === f.id), F, D.assets);
  const timeline = svc.calculateEffectivePower(vf, viewC.filter((c: any) => c.factionId === f.id), F);
  const goalEval = computeFactionPower(vf, D.characters.filter((c: any) => c.factionId === f.id && last.characterStates[c.id] === 'Alive'), viewA.filter((a: any) => a.controllingFactionId === f.id), F);
  const org = svc.calculateOrganization(vf, viewC.filter((c: any) => c.state === 'Alive' && c.factionId === f.id), F, viewA);
  const leg = svc.calculateLegitimacy(vf, F, viewA);
  out.powerVariants[f.name] = { momentum: vf.momentum, normMomentum: 50 + vf.momentum / 2, organization: org, legitimacy: leg, powerModifier: vf.powerModifier, detail, dashboard, timeline, goalEval };
}
// pressure/drift at current
const stress = last.colonyStress, scale = D.rules.influenceConvictionScale;
const alive = viewC.filter((c: any) => c.state === 'Alive' && c.characterType === 'NPC');
const drift = alive.map((c: any) => { const peers = alive.filter((p: any) => p.factionId && p.factionId === c.factionId && p.id !== c.id); const ec = c.conviction + T.influenceConvictionBonus(c, peers, scale); return { name: c.name, p: c.pressure, eff: c.pressure + stress * 10, conv: c.conviction, effConv: Math.round(ec), drift: Math.round(c.pressure + stress * 10 - ec), drift0: Math.round(c.pressure - ec) }; });
out.drift = { stress, positiveAtCurrent: drift.filter((d: any) => d.drift > 0).length, positiveAtStress0: drift.filter((d: any) => d.drift0 > 0).length, n: drift.length, over100: drift.filter((d: any) => d.eff > 100).length, sample: drift.filter((d: any) => ['Jorren Vale', 'Damaris Holt', 'Sister Marra'].includes(d.name)) };
out.drift.byStress = [0,2,4,5,6,8,10].map(st => [st, alive.filter((c: any) => { const peers = alive.filter((p: any) => p.factionId && p.factionId === c.factionId && p.id !== c.id); return c.pressure + st*10 - (c.conviction + T.influenceConvictionBonus(c, peers, scale)) > 0; }).length]);
console.log(JSON.stringify(out, null, 1));
