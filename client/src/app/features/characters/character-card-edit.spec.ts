// D9 regression: saving a character card must never write snapshot-projected values into the baseline.
import { applyCardEdit, baselineForSave, toFormModel } from './character-card-edit';
import { Character } from '../../core/models/types';

const baseline: Character = {
  id: 'jorren', name: 'Jorren Vale', characterType: 'NPC', state: 'Alive', factionId: 'keepers',
  values: { a: 0.2, b: 0.65, c: 0.15 }, conviction: 55, pressure: 50, influence: 30, impressionable: 50,
};
// What a session snapshot can project for the same character (viewCharacters()).
const projected: Character = { ...baseline, pressure: 95, influence: 70, state: 'Dead', factionId: 'aspis' };

describe('character card edits (D9)', () => {
  it('saves start from the baseline record, looked up by id', () => {
    expect(baselineForSave([baseline], 'jorren')).toBe(baseline);
    expect(baselineForSave([baseline], 'nobody')).toBeUndefined();
  });

  it('editing an unrelated card keeps baseline simulation values, not projected ones', () => {
    const fm = { ...toFormModel(baseline), occupation: 'Town Watchman' };
    const saved = applyCardEdit(baseline, 'identity', fm, baseline.values)!;
    expect(saved.occupation).toBe('Town Watchman');
    expect(saved.pressure).toBe(50);
    expect(saved.influence).toBe(30);
    expect(saved.state).toBe('Alive');
    expect(saved.factionId).toBe('keepers');
    expect(saved).not.toMatchObject({ pressure: projected.pressure });
  });

  it('only the edited card\'s fields change', () => {
    const fm = { ...toFormModel(baseline), pressure: '60' };
    const saved = applyCardEdit(baseline, 'doubt', fm, baseline.values)!;
    expect(saved).toEqual({ ...baseline, pressure: 60, influence: 30, impressionable: 50 });
  });

  it('the beliefs card copies the edited value vector', () => {
    const v = { a: 0.3, b: 0.5, c: 0.2 };
    const saved = applyCardEdit(baseline, 'beliefs', toFormModel(baseline), v)!;
    expect(saved.values).toEqual(v);
    expect(saved.values).not.toBe(v);
  });

  it('unknown card returns null', () => {
    expect(applyCardEdit(baseline, null, toFormModel(baseline), baseline.values)).toBeNull();
  });
});
