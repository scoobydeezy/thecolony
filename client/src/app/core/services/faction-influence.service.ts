import { Injectable } from '@angular/core';
import { Character, Faction } from '../models/types';

@Injectable({ providedIn: 'root' })
export class FactionInfluenceService {

  // characterInfluence = (avg * 0.6) + (max * 0.4)
  calculateCharacterInfluence(members: Character[]): number {
    if (members.length === 0) return 0;
    const avg = members.reduce((s, c) => s + c.influence, 0) / members.length;
    const max = Math.max(...members.map(c => c.influence));
    return avg * 0.6 + max * 0.4;
  }

  // normalizedMomentum = 50 + (momentum / 2)  →  range 0–100
  calculateNormalizedMomentum(momentum: number): number {
    return 50 + momentum / 2;
  }

  // totalInfluence = (baseInfluence * 0.45) + (characterInfluence * 0.35) + (normalizedMomentum * 0.20)
  calculateTotalInfluence(faction: Faction, members: Character[]): number {
    const charInfluence = this.calculateCharacterInfluence(members);
    const normalizedMomentum = this.calculateNormalizedMomentum(faction.momentum);
    const raw =
      faction.baseInfluence * 0.45
      + charInfluence       * 0.35
      + normalizedMomentum  * 0.20;
    return Math.min(100, Math.max(0, Math.round(raw)));
  }

  calculateEffectivePower(faction: Faction, members: Character[]): number {
    const totalInfluence = this.calculateTotalInfluence(faction, members);
    const legitimacyModifier = 0.5 + faction.legitimacy / 100;
    return Math.round(totalInfluence * legitimacyModifier);
  }

  topMembers(members: Character[], count = 5): Character[] {
    return [...members].sort((a, b) => b.influence - a.influence).slice(0, count);
  }
}
