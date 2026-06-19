import { Injectable } from '@angular/core';
import { Character, Faction, FormulasConfig, DEFAULT_FORMULAS } from '../models/types';

@Injectable({ providedIn: 'root' })
export class FactionInfluenceService {

  // characterInfluence = (avg * memberAvgWeight) + (max * memberMaxWeight)
  calculateCharacterInfluence(members: Character[], f: FormulasConfig = DEFAULT_FORMULAS): number {
    if (members.length === 0) return 0;
    const avg = members.reduce((s, c) => s + c.influence, 0) / members.length;
    const max = Math.max(...members.map(c => c.influence));
    return avg * f.memberAvgWeight + max * f.memberMaxWeight;
  }

  // normalizedMomentum = 50 + (momentum / 2)  →  range 0–100
  calculateNormalizedMomentum(momentum: number): number {
    return 50 + momentum / 2;
  }

  // totalInfluence = (base * baseWeight) + (charInfluence * charWeight) + (momentum * momentumWeight)
  calculateTotalInfluence(faction: Faction, members: Character[], f: FormulasConfig = DEFAULT_FORMULAS): number {
    const charInfluence = this.calculateCharacterInfluence(members, f);
    const normalizedMomentum = this.calculateNormalizedMomentum(faction.momentum);
    const raw =
      faction.baseInfluence * f.baseInfluenceWeight
      + charInfluence       * f.charInfluenceWeight
      + normalizedMomentum  * f.momentumInfluenceWeight;
    return Math.min(100, Math.max(0, Math.round(raw)));
  }

  calculateEffectivePower(faction: Faction, members: Character[], f: FormulasConfig = DEFAULT_FORMULAS): number {
    const totalInfluence = this.calculateTotalInfluence(faction, members, f);
    const legitimacyModifier = f.legitimacyBase + faction.legitimacy / f.legitimacyScale;
    const hasLeader = members.some(c => c.characterType === 'FactionLeader');
    const leaderlessMod = hasLeader ? 1 : (f.leaderlessPowerMultiplier ?? 0.75);
    return Math.round(totalInfluence * legitimacyModifier * leaderlessMod);
  }

  topMembers(members: Character[], count = 5): Character[] {
    return [...members].sort((a, b) => b.influence - a.influence).slice(0, count);
  }
}
