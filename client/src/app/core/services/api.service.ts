import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Faction, ColonyState, RelationshipOverride, RulesConfig,
  RelationshipBreakdown, SessionLogEntry, Character
} from '../models/types';

// The C# model stores value floats as flat properties; map them to/from the nested ValueVector.
function factionFromApi(f: any): Faction {
  const { truthValue, stabilityValue, agencyValue, ...rest } = f;
  return { ...rest, sortOrder: rest.sortOrder ?? 0, values: { truth: truthValue ?? 1/3, stability: stabilityValue ?? 1/3, agency: agencyValue ?? 1/3 } };
}

function factionToApi(f: Faction): any {
  const { values, ...rest } = f;
  return { ...rest, truthValue: values.truth, stabilityValue: values.stability, agencyValue: values.agency };
}

function characterFromApi(c: any): Character {
  const { truthValue, stabilityValue, agencyValue, ...rest } = c;
  return { ...rest, values: { truth: truthValue ?? 1/3, stability: stabilityValue ?? 1/3, agency: agencyValue ?? 1/3 } };
}

function characterToApi(c: Character): any {
  const { values, ...rest } = c;
  return { ...rest, truthValue: values.truth, stabilityValue: values.stability, agencyValue: values.agency };
}

function colonyStateFromApi(cs: any): ColonyState {
  const { partyTruthValue, partyStabilityValue, partyAgencyValue, ...rest } = cs;
  return { ...rest, partyName: rest.partyName ?? 'party', partyValues: { truth: partyTruthValue ?? 0.6, stability: partyStabilityValue ?? 0.25, agency: partyAgencyValue ?? 0.15 } };
}

function colonyStateToApi(cs: ColonyState): any {
  const { partyValues, ...rest } = cs;
  return { ...rest, partyTruthValue: partyValues.truth, partyStabilityValue: partyValues.stability, partyAgencyValue: partyValues.agency };
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = '/api';

  // Factions
  getFactions(): Observable<Faction[]> {
    return this.http.get<any[]>(`${this.base}/factions`).pipe(map(fs => fs.map(factionFromApi)));
  }
  createFaction(faction: Omit<Faction, 'id'>): Observable<Faction> {
    return this.http.post<any>(`${this.base}/factions`, factionToApi(faction as Faction)).pipe(map(factionFromApi));
  }
  updateFaction(faction: Faction): Observable<Faction> {
    return this.http.put<any>(`${this.base}/factions/${faction.id}`, factionToApi(faction)).pipe(map(factionFromApi));
  }
  deleteFaction(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/factions/${id}`);
  }
  reorderFactions(orderedIds: string[]): Observable<void> {
    return this.http.put<void>(`${this.base}/factions/reorder`, orderedIds);
  }

  // Colony State
  getColonyState(): Observable<ColonyState> {
    return this.http.get<any>(`${this.base}/colony-state`).pipe(map(colonyStateFromApi));
  }
  updateColonyState(state: ColonyState): Observable<ColonyState> {
    return this.http.put<any>(`${this.base}/colony-state`, colonyStateToApi(state)).pipe(map(colonyStateFromApi));
  }

  // Rules
  getRules(): Observable<RulesConfig> {
    return this.http.get<RulesConfig>(`${this.base}/rules`);
  }
  updateRules(rules: RulesConfig): Observable<RulesConfig> {
    return this.http.put<RulesConfig>(`${this.base}/rules`, rules);
  }

  // Relationships
  getRelationships(): Observable<RelationshipBreakdown[]> {
    return this.http.get<RelationshipBreakdown[]>(`${this.base}/relationships`);
  }
  getRelationship(sourceId: string, targetId: string): Observable<RelationshipBreakdown> {
    return this.http.get<RelationshipBreakdown>(`${this.base}/relationships/${sourceId}/${targetId}`);
  }

  // Overrides
  getOverrides(): Observable<RelationshipOverride[]> {
    return this.http.get<RelationshipOverride[]>(`${this.base}/overrides`);
  }
  createOverride(o: Omit<RelationshipOverride, 'id'>): Observable<RelationshipOverride> {
    return this.http.post<RelationshipOverride>(`${this.base}/overrides`, o);
  }
  updateOverride(o: RelationshipOverride): Observable<RelationshipOverride> {
    return this.http.put<RelationshipOverride>(`${this.base}/overrides/${o.id}`, o);
  }
  deleteOverride(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/overrides/${id}`);
  }

  // Characters
  getCharacters(): Observable<Character[]> {
    return this.http.get<any[]>(`${this.base}/characters`).pipe(map(cs => cs.map(characterFromApi)));
  }
  createCharacter(character: Omit<Character, 'id'>): Observable<Character> {
    return this.http.post<any>(`${this.base}/characters`, characterToApi(character as Character)).pipe(map(characterFromApi));
  }
  updateCharacter(character: Character): Observable<Character> {
    return this.http.put<any>(`${this.base}/characters/${character.id}`, characterToApi(character)).pipe(map(characterFromApi));
  }
  deleteCharacter(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/characters/${id}`);
  }

  // Session Log
  getSessionLog(): Observable<SessionLogEntry[]> {
    return this.http.get<SessionLogEntry[]>(`${this.base}/session-log`);
  }
  createSessionEntry(entry: Omit<SessionLogEntry, 'id'>): Observable<SessionLogEntry> {
    return this.http.post<SessionLogEntry>(`${this.base}/session-log`, entry);
  }
  updateSessionEntry(entry: SessionLogEntry): Observable<SessionLogEntry> {
    return this.http.put<SessionLogEntry>(`${this.base}/session-log/${entry.id}`, entry);
  }
  deleteSessionEntry(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/session-log/${id}`);
  }
}
