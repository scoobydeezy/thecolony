import { Injectable } from '@angular/core';
import { Character, Faction, FormulasConfig, DEFAULT_FORMULAS, Asset, computeAssetInfluence, computeAssetLegitimacy } from '../models/types';

@Injectable({ providedIn: 'root' })
export class FactionInfluenceService {

  // CharacterStrength = (avg * memberAvgWeight) + (max * memberMaxWeight)
  // Leaderless penalty applied here rather than to final power.
  calculateCharacterStrength(members: Character[], f: FormulasConfig = DEFAULT_FORMULAS): number {
    if (members.length === 0) return 0;
    const avg = members.reduce((s, c) => s + c.influence, 0) / members.length;
    const max = Math.max(...members.map(c => c.influence));
    const raw = avg * f.memberAvgWeight + max * f.memberMaxWeight;
    const hasLeader = members.some(c => c.characterType === 'FactionLeader');
    return raw * (hasLeader ? 1 : (f.leaderlessPowerMultiplier ?? 0.75));
  }

  // Normalized asset influence score: raw sum → 0–100
  calculateAssetInfluenceScore(assets: Asset[], factionId: string, f: FormulasConfig = DEFAULT_FORMULAS): number {
    const raw = assets
      .filter(a => a.controllingFactionId === factionId)
      .reduce((sum, a) => sum + computeAssetInfluence(a), 0);
    return Math.min(100, raw / (f.assetInfluenceScale ?? 25) * 100);
  }

  // Normalized asset legitimacy score: raw sum → 0–100
  calculateAssetLegitimacyScore(assets: Asset[], factionId: string, f: FormulasConfig = DEFAULT_FORMULAS): number {
    const raw = assets
      .filter(a => a.controllingFactionId === factionId)
      .reduce((sum, a) => sum + computeAssetLegitimacy(a), 0);
    return Math.min(100, raw / (f.assetLegitimacyScale ?? 25) * 100);
  }

  // normalizedMomentum maps -100..+100 → 0..100
  calculateNormalizedMomentum(momentum: number): number {
    return 50 + momentum / 2;
  }

  // Organization = CharacterStrength×charWeight + AssetInfluenceScore×assetWeight + NormalizedMomentum×momentumWeight
  calculateOrganization(faction: Faction, members: Character[], f: FormulasConfig = DEFAULT_FORMULAS, assets: Asset[] = []): number {
    const charStrength = this.calculateCharacterStrength(members, f);
    const assetInfluenceScore = this.calculateAssetInfluenceScore(assets, faction.id, f);
    const normalizedMomentum = this.calculateNormalizedMomentum(faction.momentum);
    const raw =
      charStrength       * f.charInfluenceWeight
      + assetInfluenceScore * f.assetInfluenceWeight
      + normalizedMomentum  * f.momentumInfluenceWeight;
    return Math.min(100, Math.max(0, Math.round(raw)));
  }

  // Legitimacy = BaseLegitimacy×baseWeight + AssetLegitimacyScore×assetWeight
  calculateLegitimacy(faction: Faction, f: FormulasConfig = DEFAULT_FORMULAS, assets: Asset[] = []): number {
    const assetLegitimacyScore = this.calculateAssetLegitimacyScore(assets, faction.id, f);
    const raw =
      faction.baseLegitimacy  * (f.baseLegitimacyWeight ?? 0.70)
      + assetLegitimacyScore  * (f.assetLegitimacyWeight ?? 0.30);
    return Math.min(100, Math.max(0, Math.round(raw)));
  }

  // Power = Organization × LegitimacyMultiplier + PowerModifier
  calculateEffectivePower(faction: Faction, members: Character[], f: FormulasConfig = DEFAULT_FORMULAS, assets: Asset[] = []): number {
    const organization = this.calculateOrganization(faction, members, f, assets);
    const legitimacy   = this.calculateLegitimacy(faction, f, assets);
    const legitimacyMultiplier = f.legitimacyBase + legitimacy / f.legitimacyScale;
    return Math.round(organization * legitimacyMultiplier + faction.powerModifier);
  }

  // Kept for backwards compat with the faction detail influence card
  calculateCharacterInfluence(members: Character[], f: FormulasConfig = DEFAULT_FORMULAS): number {
    return this.calculateCharacterStrength(members, f);
  }

  // Kept for backwards compat — now Organization is the equivalent of totalInfluence
  calculateTotalInfluence(faction: Faction, members: Character[], f: FormulasConfig = DEFAULT_FORMULAS, assets: Asset[] = []): number {
    return this.calculateOrganization(faction, members, f, assets);
  }

  topMembers(members: Character[], count = 5): Character[] {
    return [...members].sort((a, b) => b.influence - a.influence).slice(0, count);
  }
}
