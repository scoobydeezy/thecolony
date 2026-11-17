// faction-goals.csv round trip in the simplified goal model (§18.2–18.3).
import { GOAL_CSV_HEADER, goalToCsvRow, goalFromCsvRow } from './goal-csv';
import { escapeCsv, parseCsv, csvHeaderMap } from './csv-export';
import { FactionGoal } from '../models/types';

const names = { faction: (id: string) => id.toUpperCase(), character: (id: string) => `Char ${id}`, entity: (_t: string | undefined, id: string) => `Entity ${id}` };
const toCsv = (goals: FactionGoal[], header = GOAL_CSV_HEADER) =>
  [header, ...goals.map(g => goalToCsvRow(g, names))].map(r => r.map(escapeCsv).join(',')).join('\n');
/** Import every row of a CSV text, as the Factions page does. */
const fromCsv = (text: string, existing: FactionGoal[] = []) => {
  const rows = parseCsv(text), h = csvHeaderMap(rows[0]), byId = new Map(existing.map(g => [g.id, g]));
  return rows.slice(1).map(row => goalFromCsvRow(c => row[h.get(c) ?? -1] ?? '', c => h.has(c), byId.get(row[h.get('id')!]), 'camp'));
};
const goal = (x: Partial<FactionGoal>): FactionGoal => ({ id: 'g', campaignId: 'camp', factionId: 'shattered', title: 'Steal the Ledger',
  status: 'Plotting', conditionType: 'Achieve', priority: 'Major', visibility: 'Known', outcomeMode: 'Automatic', earliestAct: 2,
  progressingEffectsJson: '[]', accomplishedEffectsJson: '[]', ...x }) as FactionGoal;

describe('faction-goals.csv', () => {
  const steal = goal({ title: 'Steal the Ledger, "quietly";\nthen hide it', targetEntityType: 'Asset', targetEntityId: 'ledger', targetOwnerFactionId: 'shattered', championId: 'tavia' });
  const ritual = goal({ id: 'r', factionId: 'keepers', title: 'Complete the Ritual', status: 'Progressing', outcomeMode: 'Adjudicated',
    targetEntityType: 'Character', targetEntityId: 'vara', targetState: 'Forgotten', priority: 'Critical', visibility: 'Secret' });
  const keep = goal({ id: 'k', factionId: 'witnesses', title: 'Keep the Ledger', conditionType: 'Maintain', status: 'Progressing', earliestAct: 1,
    targetEntityType: 'Asset', targetEntityId: 'ledger', championId: 'marra' });

  it('exports the simplified model: Auto-Resolve as Yes/No, readable names; Maintain rows leave it blank; no World States', () => {
    const [s, r, k] = [steal, ritual, keep].map(g => goalToCsvRow(g, names));
    const col = (row: unknown[], c: string) => row[GOAL_CSV_HEADER.indexOf(c)];
    expect([col(s, 'AutoResolve'), col(r, 'AutoResolve'), col(k, 'AutoResolve')]).toEqual(['Yes', 'No', '']);
    expect(GOAL_CSV_HEADER).not.toContain('CompletedWorldState');   // 2026-10-26: the text lives in World Conditions
    expect([col(s, 'FactionName'), col(s, 'ChampionName'), col(s, 'TargetEntityName')]).toEqual(['SHATTERED', 'Char tavia', 'Entity ledger']);
    expect(GOAL_CSV_HEADER).not.toContain('Attempt');
  });
  it('round-trips every field, including text with commas, quotes and line breaks', () => {
    expect(fromCsv(toCsv([steal, ritual, keep]))).toEqual([steal, ritual, keep]);
  });
  it('an older export (no AutoResolve column) keeps the existing values instead of erasing them', () => {
    const oldHeader = GOAL_CSV_HEADER.filter(c => c !== 'AutoResolve');
    const rows = parseCsv(toCsv([steal, ritual]));
    const keepCols = rows[0].map((c, i) => oldHeader.includes(c) ? i : -1).filter(i => i >= 0);
    const oldCsv = rows.map(r => keepCols.map(i => escapeCsv(r[i])).join(',')).join('\n');
    expect(fromCsv(oldCsv, [steal, ritual])).toEqual([steal, ritual]);
    expect(fromCsv(oldCsv)[1].outcomeMode).toBe('Automatic');   // a new goal from an old file: the default
  });
  it('reads the editor\'s words: Planning, and Yes/No / true/false / Automatic/Adjudicated for Auto-Resolve', () => {
    const csv = ['Id,FactionId,Title,ConditionType,AutoResolve,Status', 'a,f,A,Achieve,no,Planning', 'b,f,B,Achieve,TRUE,Progressing', 'c,f,C,Achieve,Adjudicated,Plotting'].join('\n');
    expect(fromCsv(csv).map(g => [g.status, g.outcomeMode])).toEqual([['Plotting', 'Adjudicated'], ['Progressing', 'Automatic'], ['Plotting', 'Adjudicated']]);
  });
  it('a Maintain assignment drops Auto-Resolve even if the file has it; an older file\'s World State columns are ignored', () => {
    const csv = ['Id,FactionId,Title,ConditionType,AutoResolve,ProgressingWorldState', 'm,f,M,Maintain,No,should not stick'].join('\n');
    const m = fromCsv(csv)[0];
    expect(m.outcomeMode).toBe('Automatic');
    expect(Object.keys(m)).not.toContain('progressingWorldState');
  });
  it('Earliest Act: exported as I/II/III, read as I/II/III, 1/2/3 or "Act II"; absent keeps the existing value (default II)', () => {
    const csv = ['Id,FactionId,Title,ConditionType,EarliestAct', 'a,f,A,Achieve,I', 'b,f,B,Achieve,Act III', 'c,f,C,Achieve,'].join('\n');
    expect(fromCsv(csv).map(g => g.earliestAct)).toEqual([1, 3, 2]);
    expect(goalToCsvRow(goal({ earliestAct: 1 }), names)[GOAL_CSV_HEADER.indexOf('EarliestAct')]).toBe('I');
  });
  it('a file saved by a spreadsheet app (byte-order mark, spaced headers) still matches goals by Id, never duplicating them', () => {
    const csv = '\uFEFFId, FactionId ,Title,ConditionType\ng,shattered,Steal the Ledger,Achieve';
    expect(fromCsv(csv, [steal])[0]).toMatchObject({ id: 'g', championId: undefined });
  });
  it('§18.11 advance Effects round-trip as JSON cells; invalid rows are dropped; a file without the columns keeps them', () => {
    const prog = [{ targetType: 'asset', targetId: 'fund', property: 'status', delta: 0, value: 'Contested' }];
    const done = [{ targetType: 'asset', targetId: 'fund', property: 'controllingFactionId', delta: 0, value: 'institute' },
                  { targetType: 'faction', targetId: 'seekers', property: 'factionSize', delta: -30 },
                  { targetType: 'location', targetId: 'rest', property: 'state', delta: 0, value: 'Unstable' }];
    const g = goal({ progressingEffectsJson: JSON.stringify(prog), accomplishedEffectsJson: JSON.stringify(done) });
    expect(fromCsv(toCsv([g]))[0]).toEqual(g);
    const csv = ['Id,FactionId,Title,ConditionType,ProgressingEffects',
      `g,f,G,Achieve,${escapeCsv(JSON.stringify([...prog, { targetType: 'asset', targetId: 'x', property: 'tier', delta: 1 }]))}`].join('\n');
    expect(JSON.parse(fromCsv(csv)[0].progressingEffectsJson!)).toEqual(prog);   // 'tier' is not an advance Effect
    const without = ['Id,FactionId,Title,ConditionType', 'g,shattered,Steal the Ledger,Achieve'].join('\n');
    expect(fromCsv(without, [g])[0].accomplishedEffectsJson).toBe(g.accomplishedEffectsJson);
  });
  it('an older file\'s ProgressingState (§18.9) becomes one Progressing Effect on the goal\'s own target', () => {
    const csv = ['Id,FactionId,Title,ConditionType,TargetEntityType,TargetEntityId,ProgressingState', 'g,f,G,Achieve,Asset,fund,Contested',
                 'h,f,H,Achieve,,,Contested'].join('\n');
    const [g, h] = fromCsv(csv);
    expect(JSON.parse(g.progressingEffectsJson!)).toEqual([{ targetType: 'asset', targetId: 'fund', property: 'status', delta: 0, value: 'Contested' }]);
    expect(h.progressingEffectsJson).toBe('[]');
  });
  it('an older file never erases Effects it cannot express: a blank ProgressingState keeps them; a value replaces only the target status', () => {
    const shrink = { targetType: 'faction', targetId: 'seekers', property: 'factionSize', delta: -30 };
    const old = { targetType: 'asset', targetId: 'fund', property: 'status', delta: 0, value: 'Damaged' };
    const g = goal({ id: 'g', progressingEffectsJson: JSON.stringify([old, shrink]) });
    const csv = (ps: string) => ['Id,FactionId,Title,ConditionType,TargetEntityType,TargetEntityId,ProgressingState', `g,shattered,G,Achieve,Asset,fund,${ps}`].join('\n');
    expect(JSON.parse(fromCsv(csv(''), [g])[0].progressingEffectsJson!)).toEqual([old, shrink]);
    expect(JSON.parse(fromCsv(csv('Contested'), [g])[0].progressingEffectsJson!)).toEqual([{ ...old, value: 'Contested' }, shrink]);
  });
  it('a Maintain assignment has an Earliest Act too (exported and imported); a blank cell keeps the stored one', () => {
    const k = goal({ id: 'k', conditionType: 'Maintain', status: 'Progressing', earliestAct: 3 });
    expect(goalToCsvRow(k, names)[GOAL_CSV_HEADER.indexOf('EarliestAct')]).toBe('III');
    expect(fromCsv(toCsv([k]))[0].earliestAct).toBe(3);
    const blank = ['Id,FactionId,Title,ConditionType,EarliestAct', 'k,shattered,K,Maintain,'].join('\n');
    expect(fromCsv(blank, [k])[0].earliestAct).toBe(3);
  });
  it('a threshold of 0 survives (it is not treated as empty)', () => {
    const g = goal({ id: 'z', targetEntityType: 'Faction', targetEntityId: 'keepers', targetProperty: 'momentum', targetOperator: 'lte', targetThreshold: 0 });
    expect(fromCsv(toCsv([g]))[0].targetThreshold).toBe(0);
  });
});
