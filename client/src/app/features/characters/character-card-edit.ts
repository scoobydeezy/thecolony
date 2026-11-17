// Character card editing: pure helpers shared by CharacterDetailComponent and its tests.
// D9 (M0): edits always start from the BASELINE record, never from a snapshot-projected view,
// so saving in Baseline mode can't write projected pressure/influence/state/faction into baseline.
import { Character, CharacterType, CharacterState, NarrativeTier, DoubtDirection, ValueVector, BeliefPosition } from '../../core/models/types';

export type EditingCard = 'header' | 'identity' | 'society' | 'narrative' | 'beliefs' | 'doubt' | null;

export interface CharacterFormModel {
  id: string;
  name: string;
  characterType: string;
  narrativeTier: string;
  state: CharacterState;
  ancestry: string;
  heritage: string;
  class: string;
  background: string;
  level: string;
  gender: string;
  pronouns: string;
  age: string;
  occupation: string;
  aliases: string;
  summary: string;
  factionId: string;
  socialClassId: string;
  locationId: string;
  beliefc: string;
  beliefa: string;
  beliefb: string;
  doubtDirection: string;
  conviction: string;
  pressure: string;
  influence: string;
  impressionable: string;
}

export const toFormModel = (c: Character): CharacterFormModel => ({
  id: c.id,
  name: c.name,
  characterType: c.characterType,
  narrativeTier: c.narrativeTier ?? 'Minor',
  state: c.state,
  ancestry: c.ancestry ?? '',
  heritage: c.heritage ?? '',
  class: c.class ?? '',
  background: c.background ?? '',
  level: c.level?.toString() ?? '',
  gender: c.gender ?? '',
  pronouns: c.pronouns ?? '',
  age: c.age?.toString() ?? '',
  occupation: c.occupation ?? '',
  aliases: c.aliases ?? '',
  summary: c.summary ?? '',
  factionId: c.factionId ?? '',
  socialClassId: c.socialClassId ?? '',
  locationId: c.locationId ?? '',
  beliefc: c.beliefc ?? '',
  beliefa: c.beliefa ?? '',
  beliefb: c.beliefb ?? '',
  doubtDirection: c.doubtDirection ?? '',
  conviction: c.conviction.toString(),
  pressure: c.pressure.toString(),
  influence: c.influence.toString(),
  impressionable: c.impressionable.toString()
});

/** Applies one card's form edits to the baseline record. Returns null for an unknown card. */
export function applyCardEdit(baseline: Character, card: EditingCard, fm: CharacterFormModel, values: ValueVector): Character | null {
  switch (card) {
    case 'header':
      return { ...baseline, name: fm.name, characterType: fm.characterType as CharacterType, narrativeTier: fm.narrativeTier as NarrativeTier, state: fm.state, summary: fm.summary || undefined };
    case 'identity':
      return {
        ...baseline,
        gender: fm.gender || undefined,
        pronouns: fm.pronouns || undefined,
        age: fm.age ? +fm.age : undefined,
        occupation: fm.occupation || undefined,
        aliases: fm.aliases || undefined,
        ancestry: fm.ancestry || undefined,
        heritage: fm.heritage || undefined,
        class: fm.class || undefined,
        background: fm.background || undefined,
        level: fm.level ? +fm.level : undefined,
      };
    case 'society':
      return {
        ...baseline,
        factionId: fm.factionId || undefined,
        socialClassId: fm.socialClassId || undefined,
        locationId: fm.locationId || undefined,
        influence: fm.influence !== '' ? +fm.influence : 0,
        impressionable: fm.impressionable !== '' ? +fm.impressionable : 50,
      };
    case 'narrative':
      return { ...baseline, summary: fm.summary || undefined };
    case 'beliefs':
      return {
        ...baseline,
        values: { ...values },
        beliefc: (fm.beliefc as BeliefPosition) || undefined,
        beliefa: (fm.beliefa as BeliefPosition) || undefined,
        beliefb: (fm.beliefb as BeliefPosition) || undefined,
        doubtDirection: (fm.doubtDirection as DoubtDirection) || undefined,
        conviction: fm.conviction !== '' ? +fm.conviction : 0,
        pressure: fm.pressure !== '' ? +fm.pressure : 0,
      };
    case 'doubt':
      return {
        ...baseline,
        pressure: fm.pressure !== '' ? +fm.pressure : 0,
        influence: fm.influence !== '' ? +fm.influence : 0,
        impressionable: fm.impressionable !== '' ? +fm.impressionable : 50,
      };
    default:
      return null;
  }
}

/** The record a save must start from: the baseline character, looked up by id (never a projection). */
export function baselineForSave(baselineCharacters: Character[], id: string): Character | undefined {
  return baselineCharacters.find(c => c.id === id);
}
