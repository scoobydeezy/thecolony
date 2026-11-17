// API ↔ client model mapping (pure; used by ApiService and by node tooling such as tools/e2e).
import { Faction, Character, ColonyState } from '../models/types';

// The C# model stores value floats as truthValue/stabilityValue/agencyValue; map to/from ValueVector a/b/c.
// BeliefPosition enums arrive as Pascal-case strings ("Positive"/"Neutral"/"Negative"); lowercase them.
// Server sends beliefC/beliefA/beliefB (camelCase from C# BeliefC/BeliefA/BeliefB).
// Client models use beliefc/beliefa/beliefb (all lowercase). Remap and lowercase.
export function lowerBeliefPositions(obj: any): void {
  const remap: Record<string, string> = {
    beliefC: 'beliefc', beliefA: 'beliefa', beliefB: 'beliefb',
    partyBeliefC: 'partyBeliefc', partyBeliefA: 'partyBeliefa', partyBeliefB: 'partyBeliefb',
  };
  for (const [from, to] of Object.entries(remap)) {
    if (obj[from] != null) { obj[to] = obj[from].toLowerCase(); delete obj[from]; }
  }
}

export function factionFromApi(f: any): Faction {
  const { truthValue, stabilityValue, agencyValue, ...rest } = f;
  lowerBeliefPositions(rest);
  return { ...rest, sortOrder: rest.sortOrder ?? 0, factionSize: rest.factionSize ?? 0, values: { a: truthValue ?? 1/3, b: stabilityValue ?? 1/3, c: agencyValue ?? 1/3 } };
}

export function upperBeliefPositions(obj: any): void {
  const remap: Record<string, string> = {
    beliefc: 'beliefC', beliefa: 'beliefA', beliefb: 'beliefB',
    partyBeliefc: 'partyBeliefC', partyBeliefa: 'partyBeliefA', partyBeliefb: 'partyBeliefB',
  };
  for (const [from, to] of Object.entries(remap)) {
    if (obj[from] != null) { obj[to] = obj[from]; delete obj[from]; }
    else if (obj[from] === undefined) delete obj[from];
  }
}

export function factionToApi(f: Faction): any {
  const { values, ...rest } = f;
  const out: any = { ...rest, truthValue: values.a, stabilityValue: values.b, agencyValue: values.c };
  upperBeliefPositions(out);
  return out;
}

export function characterFromApi(c: any): Character {
  const { truthValue, stabilityValue, agencyValue, ...rest } = c;
  if (rest.doubtDirection) rest.doubtDirection = rest.doubtDirection.toLowerCase();
  lowerBeliefPositions(rest);
  return { ...rest, values: { a: truthValue ?? 1/3, b: stabilityValue ?? 1/3, c: agencyValue ?? 1/3 } };
}

export function characterToApi(c: Character): any {
  const { values, ...rest } = c;
  const out: any = { ...rest, truthValue: values.a, stabilityValue: values.b, agencyValue: values.c };
  if (out.doubtDirection) out.doubtDirection = out.doubtDirection.toUpperCase();
  upperBeliefPositions(out);
  return out;
}

export function colonyStateFromApi(cs: any): ColonyState {
  const { partyTruthValue, partyStabilityValue, partyAgencyValue, ...rest } = cs;
  lowerBeliefPositions(rest);
  return { ...rest, partyName: rest.partyName ?? 'party', partyValues: { a: partyTruthValue ?? 0.6, b: partyStabilityValue ?? 0.25, c: partyAgencyValue ?? 0.15 } };
}

export function colonyStateToApi(cs: ColonyState): any {
  const { partyValues, ...rest } = cs;
  const out: any = { ...rest, partyTruthValue: partyValues.a, partyStabilityValue: partyValues.b, partyAgencyValue: partyValues.c };
  upperBeliefPositions(out);
  return out;
}
