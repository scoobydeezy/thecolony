import { Injectable } from '@angular/core';
import { Character, Faction, FormulasConfig, DEFAULT_FORMULAS, Asset } from '../models/types';
import { PowerBreakdown, computePowerBreakdown } from '../sim/power';

// Thin injectable wrapper over core/sim/power.ts, the single Power implementation (capacity channels, M2).
@Injectable({ providedIn: 'root' })
export class FactionInfluenceService {

  /** Power (1–3) and its People / Holdings / Mandate channels, counted from the given (projected) world. */
  breakdown(faction: Faction, characters: Character[], assets: Asset[], f: FormulasConfig = DEFAULT_FORMULAS): PowerBreakdown {
    return computePowerBreakdown(faction, characters, assets, f);
  }

  topMembers(members: Character[], count = 5): Character[] {
    return [...members].sort((a, b) => b.influence - a.influence).slice(0, count);
  }
}
