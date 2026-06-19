import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Faction, ColonyState, RelationshipOverride, RulesConfig,
  RelationshipBreakdown, SessionLogEntry, Character,
  Session, CampaignEvent
} from '../models/types';

// The C# model stores value floats as truthValue/stabilityValue/agencyValue; map to/from ValueVector a/b/c.
// BeliefPosition enums arrive as Pascal-case strings ("Positive"/"Neutral"/"Negative"); lowercase them.
// Server sends beliefC/beliefA/beliefB (camelCase from C# BeliefC/BeliefA/BeliefB).
// Client models use beliefc/beliefa/beliefb (all lowercase). Remap and lowercase.
function lowerBeliefPositions(obj: any): void {
  const remap: Record<string, string> = {
    beliefC: 'beliefc', beliefA: 'beliefa', beliefB: 'beliefb',
    partyBeliefC: 'partyBeliefc', partyBeliefA: 'partyBeliefa', partyBeliefB: 'partyBeliefb',
  };
  for (const [from, to] of Object.entries(remap)) {
    if (obj[from] != null) { obj[to] = obj[from].toLowerCase(); delete obj[from]; }
  }
}

function factionFromApi(f: any): Faction {
  const { truthValue, stabilityValue, agencyValue, ...rest } = f;
  lowerBeliefPositions(rest);
  return { ...rest, sortOrder: rest.sortOrder ?? 0, values: { a: truthValue ?? 1/3, b: stabilityValue ?? 1/3, c: agencyValue ?? 1/3 } };
}

function upperBeliefPositions(obj: any): void {
  const remap: Record<string, string> = {
    beliefc: 'beliefC', beliefa: 'beliefA', beliefb: 'beliefB',
    partyBeliefc: 'partyBeliefC', partyBeliefa: 'partyBeliefA', partyBeliefb: 'partyBeliefB',
  };
  for (const [from, to] of Object.entries(remap)) {
    if (obj[from] != null) { obj[to] = obj[from]; delete obj[from]; }
    else if (obj[from] === undefined) delete obj[from];
  }
}

function factionToApi(f: Faction): any {
  const { values, ...rest } = f;
  const out: any = { ...rest, truthValue: values.a, stabilityValue: values.b, agencyValue: values.c };
  upperBeliefPositions(out);
  return out;
}

function characterFromApi(c: any): Character {
  const { truthValue, stabilityValue, agencyValue, ...rest } = c;
  if (rest.doubtDirection) rest.doubtDirection = rest.doubtDirection.toLowerCase();
  lowerBeliefPositions(rest);
  return { ...rest, values: { a: truthValue ?? 1/3, b: stabilityValue ?? 1/3, c: agencyValue ?? 1/3 } };
}

function characterToApi(c: Character): any {
  const { values, ...rest } = c;
  const out: any = { ...rest, truthValue: values.a, stabilityValue: values.b, agencyValue: values.c };
  upperBeliefPositions(out);
  return out;
}

function colonyStateFromApi(cs: any): ColonyState {
  const { partyTruthValue, partyStabilityValue, partyAgencyValue, ...rest } = cs;
  lowerBeliefPositions(rest);
  return { ...rest, partyName: rest.partyName ?? 'party', partyValues: { a: partyTruthValue ?? 0.6, b: partyStabilityValue ?? 0.25, c: partyAgencyValue ?? 0.15 } };
}

function colonyStateToApi(cs: ColonyState): any {
  const { partyValues, ...rest } = cs;
  const out: any = { ...rest, partyTruthValue: partyValues.a, partyStabilityValue: partyValues.b, partyAgencyValue: partyValues.c };
  upperBeliefPositions(out);
  return out;
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

  // Sessions
  getSessions(): Observable<Session[]> {
    return this.http.get<Session[]>(`${this.base}/sessions`);
  }
  getSession(id: string): Observable<Session> {
    return this.http.get<Session>(`${this.base}/sessions/${id}`);
  }
  createSession(session: Omit<Session, 'id' | 'events'>): Observable<Session> {
    return this.http.post<Session>(`${this.base}/sessions`, { ...session, events: [] });
  }
  updateSession(session: Session): Observable<Session> {
    return this.http.put<Session>(`${this.base}/sessions/${session.id}`, session);
  }
  deleteSession(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/sessions/${id}`);
  }

  // Events
  getEventsBySession(sessionId: string): Observable<CampaignEvent[]> {
    return this.http.get<CampaignEvent[]>(`${this.base}/events/by-session/${sessionId}`);
  }
  createEvent(ev: Omit<CampaignEvent, 'id'>): Observable<CampaignEvent> {
    return this.http.post<CampaignEvent>(`${this.base}/events`, ev);
  }
  updateEvent(ev: CampaignEvent): Observable<CampaignEvent> {
    return this.http.put<CampaignEvent>(`${this.base}/events/${ev.id}`, ev);
  }
  deleteEvent(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/events/${id}`);
  }

  reorderEvents(orderedIds: string[]): Observable<void> {
    return this.http.put<void>(`${this.base}/events/reorder`, orderedIds);
  }

  importSessions(sessions: Session[]): Observable<{ imported: number; skipped: number }> {
    return this.http.post<{ imported: number; skipped: number }>(`${this.base}/sessions/import`, sessions);
  }
}
