import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { AppStore } from '../../store/app.store';
import { ColonyTurn, ColonyTurnPhaseKind, EventEffect } from '../models/types';
import { ENGINE_VERSION } from '../sim/engine-version';
import { newSeed } from '../sim/prng';
import { HttpErrorResponse } from '@angular/common/http';
import { CampaignWorld, buildOpeningInputs, buildFactionPhaseInputs, buildCharacterPhaseInputs, withDraftTurnEvent, FactionPhaseBuild } from '../sim/colony-turn';
import { resolveCharacterPhase, characterPhaseEffects, CharacterPhaseInputs, CharacterPhaseResults } from '../sim/character-phase';
import { resolveOpening, openingEffects, OpeningInputs, OpeningResults } from '../sim/opening';
import { resolveFactionPhase, factionPhaseEffects, canonicalJson, sha256Hex, DiceOverride, FactionPhaseResults, FpOptions } from '../sim/faction-phase';

type NewEffect = Omit<EventEffect, 'id' | 'eventId'>;

export interface PreparedOpening { inputs: OpeningInputs; results: OpeningResults; effects: NewEffect[]; historyVersion: number }
export interface PreparedCharacterPhase { inputs: CharacterPhaseInputs; results: CharacterPhaseResults; effects: NewEffect[]; historyVersion: number }
export interface PreparedFactionPhase { build: FactionPhaseBuild; results: FactionPhaseResults; effects: NewEffect[]; historyVersion: number }
/** An uncommitted Colony Turn: the history it was drawn from (and that history's version) and its seed. */
export interface TurnDraftBase { sessionId: string; seed: number; world: CampaignWorld; historyVersion: number }

function errorText(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 409 && e.error?.error === 'stale')
      return 'The campaign changed while this Colony Turn was open, so nothing was saved. Discard it and run the turn again.';
    if (typeof e.error === 'string' && e.error) return e.error;
    return e.error?.message ?? e.error?.title ?? e.message;
  }
  return e instanceof Error ? e.message : String(e);
}

/**
 * M5: runs a Colony Turn. The turn is drawn from one fresh read of history (never the store's possibly stale copy);
 * each phase is built on the earlier phases' Effects, previewed, and the whole turn is confirmed at once with each
 * phase's canonical frozen inputs, their SHA-256, and the history version it was drawn against. The server re-derives
 * every phase (ColonyTurnEngine) and rejects stale or non-reproducing turns, writing nothing.
 */
@Injectable({ providedIn: 'root' })
export class ColonyTurnService {
  private api = inject(ApiService);
  private store = inject(AppStore);

  readonly turns = signal<ColonyTurn[]>([]);

  constructor() {
    // the turn list belongs to the active campaign: reload it whenever the campaign changes (or first loads)
    effect(() => {
      const id = this.store.activeCampaign()?.id;
      untracked(() => { this.turns.set([]); if (id) this.load(); });
    });
  }
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  async load(): Promise<void> { this.turns.set(await firstValueFrom(this.api.getColonyTurns())); }

  /** The session's current (non-voided) turn. */
  turnFor(sessionId: string): ColonyTurn | undefined {
    return this.turns().find(t => t.sessionId === sessionId && t.status !== 'Voided');
  }

  /** History and its version, read so that both belong to the same moment (re-read if a write landed in between). */
  private async fresh(): Promise<{ world: CampaignWorld; historyVersion: number }> {
    for (let i = 0; i < 3; i++) {
      const before = (await firstValueFrom(this.api.getHistoryVersion())).historyVersion;
      const [colonyState, factions, characters, assets, goals, locations, sessions, rules, conditions] = await Promise.all([
        firstValueFrom(this.api.getColonyState()), firstValueFrom(this.api.getFactions()), firstValueFrom(this.api.getCharacters()),
        firstValueFrom(this.api.getAssets()), firstValueFrom(this.api.getFactionGoals()), firstValueFrom(this.api.getLocations()),
        firstValueFrom(this.api.getSessions()), firstValueFrom(this.api.getRules()), firstValueFrom(this.api.getWorldConditions())]);
      const after = (await firstValueFrom(this.api.getHistoryVersion())).historyVersion;
      if (before === after) return { world: { colonyState, factions, characters, assets, goals, locations, sessions, rules, conditions }, historyVersion: after };
    }
    throw new Error('History kept changing while the Colony Turn was being prepared; try again.');
  }

  private async run<T>(work: () => Promise<T>): Promise<T | undefined> {
    this.busy.set(true); this.error.set(null);
    try { return await work(); }
    catch (e) { this.error.set(errorText(e)); return undefined; }
    finally { this.busy.set(false); }
  }

  /**
   * Begin a Colony Turn for a session: one fresh read of history (and its version), a new seed, and the Opening.
   * Nothing is written; the turn exists only on the client until `complete`.
   */
  begin(sessionId: string) {
    return this.run(async (): Promise<TurnDraftBase & { opening: PreparedOpening }> => {
      const { world, historyVersion } = await this.fresh();
      const seed = newSeed();
      const inputs = buildOpeningInputs(world, sessionId, seed);
      const results = resolveOpening(inputs);
      return { sessionId, seed, world, historyVersion, opening: { inputs, results, effects: openingEffects(inputs, results), historyVersion } };
    });
  }

  /** The Faction Phase, built on the draft's world with the earlier phases' Effects in place (pure). */
  draftFactionPhase(d: TurnDraftBase, prior: NewEffect[], dice: DiceOverride = {}, opts: FpOptions = {}): PreparedFactionPhase {
    const build = buildFactionPhaseInputs(withDraftTurnEvent(d.world, d.sessionId, prior), d.sessionId, d.seed);
    const results = resolveFactionPhase(build.inputs, dice, opts);
    return { build, results, effects: factionPhaseEffects(build.inputs, results), historyVersion: d.historyVersion };
  }

  /** Re-resolve a prepared Faction Phase with overridden dice and the GM's accepted resolutions (pure). */
  withDice(p: PreparedFactionPhase, dice: DiceOverride, opts: FpOptions = {}): PreparedFactionPhase {
    const results = resolveFactionPhase(p.build.inputs, dice, opts);
    return { ...p, results, effects: factionPhaseEffects(p.build.inputs, results) };
  }

  /** The Character Phase, built on the draft's world with the earlier phases' Effects in place (pure). */
  draftCharacterPhase(d: TurnDraftBase, prior: NewEffect[]): PreparedCharacterPhase {
    const inputs = buildCharacterPhaseInputs(withDraftTurnEvent(d.world, d.sessionId, prior), d.sessionId, d.seed);
    const results = resolveCharacterPhase(inputs);
    return { inputs, results, effects: characterPhaseEffects(results), historyVersion: d.historyVersion };
  }

  /** Re-resolve a prepared Character Phase with table dice (Defection Checks and Drift Rolls, keyed by character id). */
  withCharacterDice(p: PreparedCharacterPhase, dice: Record<string, [number, number]>,
                    opts: { overrideSource?: 'physical' | 'reroll' } = {}): PreparedCharacterPhase {
    const results = resolveCharacterPhase(p.inputs, dice, opts);
    return { ...p, results, effects: characterPhaseEffects(results) };
  }

  /**
   * Confirm: the whole turn in one request. The server re-derives every phase, adds Publish and commits, in one
   * transaction; if history changed since `begin`, or anything fails to reproduce, nothing is written.
   */
  complete(d: TurnDraftBase, phases: { kind: Exclude<ColonyTurnPhaseKind, 'Publish'>; inputs: unknown; results: unknown; effects: NewEffect[] }[]) {
    return this.run(async () => {
      const body = await Promise.all(phases.map(async p => {
        const frozenInputsJson = canonicalJson(p.inputs);
        return { kind: p.kind, frozenInputsJson, frozenInputsHash: await sha256Hex(frozenInputsJson), resultsJson: JSON.stringify(p.results), effects: p.effects };
      }));
      await firstValueFrom(this.api.completeColonyTurn(d.historyVersion, { sessionId: d.sessionId, seed: d.seed, engineVersion: ENGINE_VERSION, phases: body }));
      await this.afterWrite();
      return true;
    });
  }

  /** Discard an unfinished turn left by the earlier phase-by-phase flow (its Effects are removed). */
  voidTurn(turn: ColonyTurn) {
    return this.run(async () => {
      const { historyVersion } = await this.fresh();
      await firstValueFrom(this.api.voidColonyTurn(turn.id, historyVersion));
      await this.afterWrite();
    });
  }

  private async afterWrite(): Promise<void> {
    await this.load();
    this.store.loadSessions();   // the Turn's Effects live on its session's Colony Turn Event
  }
}
