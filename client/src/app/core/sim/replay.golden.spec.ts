// Golden replay test (M0). Locks the snapshot engine's output for a real campaign fixture.
// Any intended behaviour change must update the golden file deliberately and be explained in M0-CHANGES.md.
import { buildColonySnapshots, projectFactions, projectCharacters, projectAssets } from './replay';
import { computePowerBreakdown } from './power';
import { DEFAULT_FORMULAS } from '../models/types';

import fixtureJson from './__fixtures__/colony-2026-10-14.json';
import goldenJson from './__fixtures__/colony-2026-10-14.golden.json';
import powerGoldenJson from './__fixtures__/colony-2026-10-14.power.golden.json';
const fixture: any = fixtureJson, golden: unknown = goldenJson, powerGolden: unknown = powerGoldenJson;

// Regenerate goldens (vitest, from client/):  UPDATE_GOLDEN=1 npx vitest run src/app/core/sim/replay.golden.spec.ts
// Node built-ins load only in update mode, via a variable specifier, so this spec also compiles and runs
// under the Angular test target (no @types/node, bundled specs).
const updateGolden = !!(globalThis as any).process?.env?.['UPDATE_GOLDEN'];
async function writeGolden(name: string, data: unknown): Promise<void> {
  const nodeFs = 'node:fs';
  const { writeFileSync }: any = await import(/* @vite-ignore */ nodeFs);
  writeFileSync(`src/app/core/sim/__fixtures__/${name}`, JSON.stringify(data, null, 1) + '\n');
}

function replay() {
  const sessions = [...fixture.sessions].sort((a: any, b: any) => a.number - b.number);
  return buildColonySnapshots(fixture.colonyState, fixture.factions, fixture.characters, sessions,
    fixture.rules, fixture.assets, fixture.goals, fixture.locations);
}

describe('snapshot replay (golden)', () => {
  it('reproduces the recorded snapshots for the 2026-10-14 campaign fixture', async () => {
    const actual = JSON.parse(JSON.stringify(replay()));
    if (updateGolden) return writeGolden('colony-2026-10-14.golden.json', actual);
    expect(actual).toEqual(golden);
  });
});

// Canonical Power breakdown for every faction at baseline and after each session (D4; capacity channels since M2).
function powerTable() {
  const formulas = { ...DEFAULT_FORMULAS, ...JSON.parse(fixture.rules.formulasJson || '{}') };
  const points = [null, ...replay()];
  return points.map(snap => ({
    at: snap ? `S${snap.sessionNumber}` : 'baseline',
    factions: Object.fromEntries(projectFactions(fixture.factions, snap).map((f: any) => {
      const pb = computePowerBreakdown(f, projectCharacters(fixture.characters, snap), projectAssets(fixture.assets, snap), formulas);
      return [f.id, { members: pb.members.length, leaderCapable: pb.leaderCapable, power: pb.power, reasons: pb.reasons,
        people: pb.people.score, leaderBonus: pb.people.leaderBonus, size: pb.people.size, sizePoints: pb.people.sizePoints,
        holdings: pb.holdings.score, mandate: pb.mandate.score }];
    })),
  }));
}

describe('faction Power (golden)', () => {
  it('reproduces the canonical Power breakdown at baseline and every snapshot', async () => {
    const actual = JSON.parse(JSON.stringify(powerTable()));
    if (updateGolden) return writeGolden('colony-2026-10-14.power.golden.json', actual);
    expect(actual).toEqual(powerGolden);
  });
});
