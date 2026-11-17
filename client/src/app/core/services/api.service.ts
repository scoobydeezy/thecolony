import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Faction, ColonyState, RelationshipOverride, RulesConfig,
  RelationshipBreakdown, SessionLogEntry, Character,
  Session, CampaignEvent, Campaign, AppSettings,
  Asset, FactionGoal,
  CharacterNarrativeProfile, CharacterDetail, CharacterRelationship,
  Location, ColonyMap, MapPlacement, EventEffect, RulesVersion, ColonyTurn, ColonyTurnPhase, ColonyTurnPhaseKind, WorldCondition,
} from '../models/types';

import { factionFromApi, factionToApi, characterFromApi, characterToApi, colonyStateFromApi, colonyStateToApi } from './api-mappers';

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
  uploadFactionGlyph(id: string, file: File): Observable<{ path: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ path: string }>(`${this.base}/factions/${id}/upload-glyph`, fd);
  }
  uploadFactionIcon(id: string, file: File): Observable<{ path: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ path: string }>(`${this.base}/factions/${id}/upload-icon`, fd);
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
  // Live campaigns version rules: pass the Event the new rules take effect from (M1).
  updateRules(rules: RulesConfig, effectiveFromEventId?: string, engineVersion?: string): Observable<RulesConfig> {
    const params: Record<string, string> = {};
    if (effectiveFromEventId) params['effectiveFromEventId'] = effectiveFromEventId;
    if (engineVersion) params['engineVersion'] = engineVersion;
    return this.http.put<RulesConfig>(`${this.base}/rules`, rules, { params });
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
  uploadCharacterPortrait(id: string, file: File): Observable<{ path: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ path: string }>(`${this.base}/characters/${id}/upload-portrait`, fd);
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

  reorderNarrativeEvents(orderedIds: string[]): Observable<void> {
    return this.http.put<void>(`${this.base}/narrative/events/reorder`, orderedIds);
  }

  // Assets
  getAssets(): Observable<Asset[]> {
    return this.http.get<Asset[]>(`${this.base}/assets`);
  }
  createAsset(asset: Omit<Asset, 'id' | 'campaignId'>): Observable<Asset> {
    return this.http.post<Asset>(`${this.base}/assets`, asset);
  }
  updateAsset(asset: Asset): Observable<Asset> {
    return this.http.put<Asset>(`${this.base}/assets/${asset.id}`, asset);
  }
  deleteAsset(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/assets/${id}`);
  }

  // Faction Goals
  getFactionGoals(): Observable<FactionGoal[]> {
    return this.http.get<FactionGoal[]>(`${this.base}/faction-goals`);
  }
  createFactionGoal(goal: Omit<FactionGoal, 'id' | 'campaignId'>): Observable<FactionGoal> {
    return this.http.post<FactionGoal>(`${this.base}/faction-goals`, goal);
  }
  updateFactionGoal(goal: FactionGoal): Observable<FactionGoal> {
    return this.http.put<FactionGoal>(`${this.base}/faction-goals/${goal.id}`, goal);
  }
  deleteFactionGoal(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/faction-goals/${id}`);
  }

  // World Conditions (§18.6)
  getWorldConditions(): Observable<WorldCondition[]> { return this.http.get<WorldCondition[]>(`${this.base}/world-conditions`); }
  createWorldCondition(c: Omit<WorldCondition, 'id' | 'campaignId'>): Observable<WorldCondition> {
    return this.http.post<WorldCondition>(`${this.base}/world-conditions`, c);
  }
  updateWorldCondition(c: WorldCondition): Observable<WorldCondition> { return this.http.put<WorldCondition>(`${this.base}/world-conditions/${c.id}`, c); }
  deleteWorldCondition(id: string): Observable<void> { return this.http.delete<void>(`${this.base}/world-conditions/${id}`); }

  importSessions(sessions: Session[]): Observable<{ imported: number; skipped: number }> {
    return this.http.post<{ imported: number; skipped: number }>(`${this.base}/sessions/import`, sessions);
  }

  // Campaigns
  getCampaigns(): Observable<Campaign[]> {
    return this.http.get<Campaign[]>(`${this.base}/campaigns`);
  }
  createCampaign(campaign: Pick<Campaign, 'name' | 'description'>): Observable<Campaign> {
    return this.http.post<Campaign>(`${this.base}/campaigns`, campaign);
  }
  updateCampaign(campaign: Campaign): Observable<Campaign> {
    return this.http.put<Campaign>(`${this.base}/campaigns/${campaign.id}`, campaign);
  }
  activateCampaign(id: string, engineVersion: string): Observable<Campaign> {
    return this.http.post<Campaign>(`${this.base}/campaigns/${id}/activate`, { engineVersion });
  }
  getRulesVersions(campaignId: string): Observable<RulesVersion[]> {
    return this.http.get<RulesVersion[]>(`${this.base}/campaigns/${campaignId}/rules-versions`);
  }
  getColonyTurns(): Observable<ColonyTurn[]> {
    return this.http.get<ColonyTurn[]>(`${this.base}/colony-turns`);
  }
  // M5: Colony Turn procedure. Phase commits and voids carry If-History-Version (409 'stale' if history moved).
  getHistoryVersion(): Observable<{ historyVersion: number }> {
    return this.http.get<{ historyVersion: number }>(`${this.base}/colony-turns/history-version`);
  }
  createColonyTurn(sessionId: string, seed: number, engineVersion: string): Observable<ColonyTurn> {
    return this.http.post<ColonyTurn>(`${this.base}/colony-turns`, { sessionId, seed, engineVersion });
  }
  commitColonyTurnPhase(turnId: string, historyVersion: number, body: {
    kind: ColonyTurnPhaseKind; frozenInputsJson: string; frozenInputsHash: string; resultsJson: string; effects: Omit<EventEffect, 'id' | 'eventId'>[];
  }): Observable<{ phase: ColonyTurnPhase; historyVersion: number }> {
    return this.http.post<{ phase: ColonyTurnPhase; historyVersion: number }>(`${this.base}/colony-turns/${turnId}/phases`, body,
      { headers: { 'If-History-Version': String(historyVersion) } });
  }
  completeColonyTurn(historyVersion: number, body: {
    sessionId: string; seed: number; engineVersion: string;
    phases: { kind: ColonyTurnPhaseKind; frozenInputsJson: string; frozenInputsHash: string; resultsJson: string; effects: Omit<EventEffect, 'id' | 'eventId'>[] }[];
  }): Observable<{ turn: ColonyTurn; historyVersion: number }> {
    return this.http.post<{ turn: ColonyTurn; historyVersion: number }>(`${this.base}/colony-turns/complete`, body,
      { headers: { 'If-History-Version': String(historyVersion) } });
  }
  voidColonyTurnPhase(turnId: string, phaseId: string, historyVersion: number): Observable<{ historyVersion: number }> {
    return this.http.post<{ historyVersion: number }>(`${this.base}/colony-turns/${turnId}/phases/${phaseId}/void`, {},
      { headers: { 'If-History-Version': String(historyVersion) } });
  }
  voidColonyTurn(turnId: string, historyVersion: number): Observable<{ historyVersion: number }> {
    return this.http.post<{ historyVersion: number }>(`${this.base}/colony-turns/${turnId}/void`, {},
      { headers: { 'If-History-Version': String(historyVersion) } });
  }
  deleteCampaign(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/campaigns/${id}`);
  }
  importEntities(sourceCampaignId: string, entityTypes: string[], importAll: boolean): Observable<void> {
    return this.http.post<void>(`${this.base}/campaigns/import`, { sourceCampaignId, entityTypes, importAll });
  }

  // App Settings
  getSettings(): Observable<AppSettings> {
    return this.http.get<AppSettings>(`${this.base}/settings`);
  }
  setActiveCampaign(campaignId: string): Observable<AppSettings> {
    return this.http.patch<AppSettings>(`${this.base}/settings`, { activeCampaignId: campaignId });
  }

  // Character Narrative Profile
  getNarrativeProfile(characterId: string): Observable<CharacterNarrativeProfile> {
    return this.http.get<CharacterNarrativeProfile>(`${this.base}/characters/${characterId}/narrative-profile`);
  }
  upsertNarrativeProfile(profile: CharacterNarrativeProfile): Observable<CharacterNarrativeProfile> {
    return this.http.put<CharacterNarrativeProfile>(`${this.base}/characters/${profile.characterId}/narrative-profile`, profile);
  }
  deleteNarrativeProfile(characterId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/characters/${characterId}/narrative-profile`);
  }

  // Character Details
  getCharacterDetails(characterId: string): Observable<CharacterDetail[]> {
    return this.http.get<CharacterDetail[]>(`${this.base}/characters/${characterId}/details`);
  }
  createCharacterDetail(characterId: string, detail: Omit<CharacterDetail, 'id' | 'characterId'>): Observable<CharacterDetail> {
    return this.http.post<CharacterDetail>(`${this.base}/characters/${characterId}/details`, detail);
  }
  updateCharacterDetail(characterId: string, detail: CharacterDetail): Observable<CharacterDetail> {
    return this.http.put<CharacterDetail>(`${this.base}/characters/${characterId}/details/${detail.id}`, detail);
  }
  deleteCharacterDetail(characterId: string, detailId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/characters/${characterId}/details/${detailId}`);
  }
  reorderCharacterDetails(characterId: string, orderedIds: string[]): Observable<void> {
    return this.http.patch<void>(`${this.base}/characters/${characterId}/details/reorder`, orderedIds);
  }

  // Character Relationships
  getCharacterRelationships(characterId: string): Observable<CharacterRelationship[]> {
    return this.http.get<CharacterRelationship[]>(`${this.base}/characters/${characterId}/relationships`);
  }
  createCharacterRelationship(characterId: string, rel: Omit<CharacterRelationship, 'id' | 'sourceCharacterId'>): Observable<CharacterRelationship> {
    return this.http.post<CharacterRelationship>(`${this.base}/characters/${characterId}/relationships`, rel);
  }
  updateCharacterRelationship(characterId: string, rel: CharacterRelationship): Observable<CharacterRelationship> {
    return this.http.put<CharacterRelationship>(`${this.base}/characters/${characterId}/relationships/${rel.id}`, rel);
  }
  deleteCharacterRelationship(characterId: string, relId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/characters/${characterId}/relationships/${relId}`);
  }

  // Locations
  getLocations(): Observable<Location[]> {
    return this.http.get<Location[]>(`${this.base}/locations`);
  }
  createLocation(location: Omit<Location, 'id' | 'campaignId'>): Observable<Location> {
    return this.http.post<Location>(`${this.base}/locations`, location);
  }
  updateLocation(location: Location): Observable<Location> {
    return this.http.put<Location>(`${this.base}/locations/${location.id}`, location);
  }
  deleteLocation(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/locations/${id}`);
  }

  // Maps
  getColonyMaps(): Observable<ColonyMap[]> {
    return this.http.get<ColonyMap[]>(`${this.base}/maps`);
  }
  createColonyMap(map: Omit<ColonyMap, 'id' | 'campaignId'>): Observable<ColonyMap> {
    return this.http.post<ColonyMap>(`${this.base}/maps`, map);
  }
  updateColonyMap(map: ColonyMap): Observable<ColonyMap> {
    return this.http.put<ColonyMap>(`${this.base}/maps/${map.id}`, map);
  }
  deleteColonyMap(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/maps/${id}`);
  }
  uploadMapImage(file: File): Observable<{ path: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ path: string }>(`${this.base}/maps/upload`, fd);
  }

  // Map Placements
  getMapPlacements(): Observable<MapPlacement[]> {
    return this.http.get<MapPlacement[]>(`${this.base}/map-placements`);
  }
  createMapPlacement(placement: Omit<MapPlacement, 'id'>): Observable<MapPlacement> {
    return this.http.post<MapPlacement>(`${this.base}/map-placements`, placement);
  }
  updateMapPlacement(placement: MapPlacement): Observable<MapPlacement> {
    return this.http.put<MapPlacement>(`${this.base}/map-placements/${placement.id}`, placement);
  }
  deleteMapPlacement(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/map-placements/${id}`);
  }

  // Map Edits (synthetic EventEffects attached to the session's invisible MapEdits event)
  upsertMapEdit(req: {
    sessionId: string;
    targetType: string;
    targetId: string;
    property: string;
    value?: string | null;
    secondaryTargetId?: string | null;
  }): Observable<EventEffect> {
    return this.http.post<EventEffect>(`${this.base}/map-edits`, req);
  }

  deleteMapEdit(params: {
    sessionId: string;
    targetType: string;
    targetId: string;
    property: string;
  }): Observable<void> {
    return this.http.delete<void>(`${this.base}/map-edits`, { params });
  }

  // Generic promise-based helpers for use in async store methods
  get<T>(path: string): Promise<T> {
    return firstValueFrom(this.http.get<T>(`${this.base}/${path}`));
  }
  post<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.post<T>(`${this.base}/${path}`, body));
  }
  put<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.put<T>(`${this.base}/${path}`, body));
  }
  delete(path: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/${path}`));
  }
}
