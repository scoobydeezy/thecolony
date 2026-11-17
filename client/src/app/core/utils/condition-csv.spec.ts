// world-conditions.csv: round trip, Id preservation, and rejection of malformed requirement lists.
import { CONDITION_CSV_HEADER, conditionToCsvRow, conditionFromCsvRow } from './condition-csv';
import { escapeCsv, parseCsv, csvHeaderMap } from './csv-export';
import { WorldCondition } from '../models/types';

const toCsv = (cs: WorldCondition[]) => [CONDITION_CSV_HEADER, ...cs.map(conditionToCsvRow)].map(r => r.map(escapeCsv).join(',')).join('\n');
const fromCsv = (text: string, existing: WorldCondition[] = []) => {
  const rows = parseCsv(text), h = csvHeaderMap(rows[0]);
  return rows.slice(1).map(row => { const get = (c: string) => row[h.get(c) ?? -1] ?? '';
    return conditionFromCsvRow(get, existing.find(e => e.id === get('id')), 'camp'); });
};
const wc = (x: Partial<WorldCondition>): WorldCondition => ({ id: 'civic_alarm_lost', campaignId: 'camp', title: 'Civic Alarm Lost',
  rule: 'Loss of the Colony\'s familiar civic alarm, "the Bell", increases public unease.', ruleOtherwise: 'The Bell rings, as it always has.', activeAtStart: true, sortOrder: 3,
  requirementsJson: JSON.stringify([{ kind: 'assetStatus', assetId: 'bell', statuses: ['Destroyed'] }]), stressContribution: 1, ...x });

describe('world-conditions.csv', () => {
  it('round-trips every field, keeping the Id (so goal Effects can name it)', () => {
    const a = wc({ variesByJson: null }), b = wc({ id: 'procession_secured', title: 'Procession Secured', ruleOtherwise: null, activeAtStart: false, requirementsJson: '[]', stressContribution: 0, variesByJson: null });
    const c = wc({ id: 'cache_looting', title: 'Cache Looting', rule: '', ruleOtherwise: null, requirementsJson: '[]', stressContribution: 0,
      variesByJson: JSON.stringify({ subject: { kind: 'assetStatus', id: 'ddn' }, rows: [{ state: 'Stable', text: 'Loot on 4–6, "d6"', stress: 0 }, { state: 'Destroyed', text: '', stress: 1 }] }) });
    expect(fromCsv(toCsv([c])).map(r => 'condition' in r ? r.condition : r)).toEqual([c]);
    expect(fromCsv(toCsv([a, b])).map(r => 'condition' in r ? r.condition : r)).toEqual([a, b]);
  });
  it('2026-10-26 goal-driven: a goal-stage table and a goal-stage requirement round-trip', () => {
    const t = wc({ id: 'goal_g1', title: 'Abide', rule: '', ruleOtherwise: null, requirementsJson: '[]', stressContribution: 0,
      variesByJson: JSON.stringify({ subject: { kind: 'goalStage', id: 'g1' }, rows: [{ state: 'Progressing', text: 'Attendants admitted', stress: 1 }] }) });
    const r = wc({ id: 'order_excluded', ruleOtherwise: null, variesByJson: null,
      requirementsJson: JSON.stringify([{ kind: 'goalStage', goalId: 'g2', stages: ['Accomplished'] }, { kind: 'assetController', assetId: 'hall', factionId: 'seekers' }]) });
    expect(fromCsv(toCsv([t, r])).map(x => 'condition' in x ? x.condition : x)).toEqual([t, r]);
  });
  it('a file without a column keeps the stored value; an older file cannot turn a stored table into an Event condition', () => {
    const table = wc({ id: 'procession_secured', title: 'Procession Secured', rule: '', ruleOtherwise: null, requirementsJson: '[]', stressContribution: 0,
      variesByJson: JSON.stringify({ subject: { kind: 'goalStage', id: 'g' }, rows: [{ state: 'Accomplished', text: 'Guards', stress: 0 }] }) });
    const rows = parseCsv(['Id,Title,Rule,ActiveAtStart', 'civic_alarm_lost,Civic Alarm Lost,x,Yes', 'procession_secured,Procession Secured,Guards,No'].join('\n'));
    const h = csvHeaderMap(rows[0]), stored = [wc({ variesByJson: null }), table];
    const [kept, refused] = rows.slice(1).map(row => { const get = (c: string) => row[h.get(c) ?? -1] ?? '';
      return conditionFromCsvRow(get, stored.find(e => e.id === get('id')), 'camp', c => h.has(c)); });
    expect('condition' in kept && kept.condition.requirementsJson).toBe(stored[0].requirementsJson);   // no Requirements column
    expect('error' in refused && refused.error).toMatch(/always ActiveAtStart Yes/);
  });
  it('refuses a row without a title, or with malformed or unknown requirements', () => {
    const csv = ['Id,Title,Requirements', 'a,,', 'b,B,not json', 'c,C,"[{""kind"":""stressAbove""}]"', 'd,D,'].join('\n');
    expect(fromCsv(csv).map(r => 'error' in r)).toEqual([true, true, true, false]);
  });
});
