// Faction Power: capacity channels in plain points (BOARD-GAME-REVIEW §18.7; People revised §18.8). The single implementation used by every
// view, the snapshot engine and the Faction Phase. Reproducible with character tokens and Asset cards:
//
//   People   = leader bonus (5, a capable leader) + ⌊Faction Size ÷ 20⌋                               qualifies at 10
//   Holdings = stars of controlled Operational, Strategic and Covert Assets                         qualifies at 15
//   Mandate  = stars of controlled Symbolic and Mandate Assets                                     qualifies at  5
//   Power    = qualifying channels, 0–3 (no baseline, no minimum, no modifiers)
//
// Faction Size is the recorded total membership; named characters add nothing individually (they are who can champion
// goals, §18.8). A capable leader is alive and a member (any living character of the group). A Destroyed Asset
// contributes nothing; Damaged and Contested Assets count in full. Character Influence, Legitimacy and Momentum are not
// inputs. The thresholds are rule definitions; the campaign's starting pieces are balanced to them separately.
import { Asset, Character, Faction, FormulasConfig, DEFAULT_FORMULAS, ASSET_ROLE_CHANNEL, assetStars } from '../models/types';

export interface ChannelResult {
  score: number;       // points
  threshold: number;
  qualifies: boolean;
  margin: number;      // score − threshold (negative: short of the line)
}

export interface PeopleChannel extends ChannelResult {
  leaderBonus: number;         // the bonus if the leader is capable, else 0
  size: number;                // Faction Size: total membership as recorded
  sizePoints: number;          // ⌊size ÷ membersPerPoint⌋
  membersPerPoint: number;
}

export interface AssetChannelResult extends ChannelResult {
  assets: { asset: Asset; stars: number }[];   // controlled Assets counted toward this channel (stars after status)
}

export interface PowerBreakdown {
  members: Character[];        // living members counted (faction or social-class membership)
  leaderCapable: boolean;      // the leader is alive and still a member
  people: PeopleChannel;
  holdings: AssetChannelResult;
  mandate: AssetChannelResult;
  power: 0 | 1 | 2 | 3;
  reasons: string[];           // one short reason per qualifying channel, e.g. "People 10"
}

/** Living characters who belong to the group, as faction members or (for social classes) class members. */
export function powerMembers(faction: Faction, characters: Character[]): Character[] {
  return characters.filter(c => c.state === 'Alive' && (c.factionId === faction.id || c.socialClassId === faction.id));
}

/** The leader is alive and still a member: only then does the leader bonus apply (once). */
export function leaderCapable(faction: Faction, members: Character[]): boolean {
  return faction.leaderId != null && members.some(m => m.id === faction.leaderId);
}

export function peopleChannel(faction: Faction, members: Character[], f: FormulasConfig = DEFAULT_FORMULAS): PeopleChannel {
  const per = Math.max(1, f.membersPerPoint ?? DEFAULT_FORMULAS.membersPerPoint);
  const size = Math.max(0, faction.factionSize ?? 0);
  const leaderBonus = leaderCapable(faction, members) ? (f.leaderBonus ?? DEFAULT_FORMULAS.leaderBonus) : 0;
  const sizePoints = Math.floor(size / per);
  return { ...channel(leaderBonus + sizePoints, f.peoplePoints ?? DEFAULT_FORMULAS.peoplePoints), leaderBonus, size, sizePoints, membersPerPoint: per };
}

/** Stars of the Assets the faction controls, toward one channel. */
export function assetChannel(assets: Asset[], factionId: string, which: 'holdings' | 'mandate', threshold: number): AssetChannelResult {
  const counted = assets.filter(a => a.controllingFactionId === factionId && ASSET_ROLE_CHANNEL[a.role] === which)
    .map(asset => ({ asset, stars: assetStars(asset) }));
  return { ...channel(counted.reduce((s, x) => s + x.stars, 0), threshold), assets: counted };
}

const channel = (score: number, threshold: number): ChannelResult =>
  ({ score, threshold, qualifies: score >= threshold, margin: score - threshold });

/**
 * Power and its channels for one faction. `characters` and `assets` are the whole (possibly snapshot-projected) world;
 * membership and control are filtered here so every caller counts the same people and holdings.
 */
export function computePowerBreakdown(faction: Faction, characters: Character[], assets: Asset[], f: FormulasConfig = DEFAULT_FORMULAS): PowerBreakdown {
  const members = powerMembers(faction, characters);
  const people = peopleChannel(faction, members, f);
  const holdings = assetChannel(assets, faction.id, 'holdings', f.holdingsPoints ?? DEFAULT_FORMULAS.holdingsPoints);
  const mandate = assetChannel(assets, faction.id, 'mandate', f.mandatePoints ?? DEFAULT_FORMULAS.mandatePoints);
  const reasons: string[] = [];
  if (people.qualifies) reasons.push(`People ${people.score}`);
  if (holdings.qualifies) reasons.push(`Holdings ${holdings.score}`);
  if (mandate.qualifies) reasons.push(`Mandate ${mandate.score}`);
  return { members, leaderCapable: leaderCapable(faction, members), people, holdings, mandate, power: reasons.length as 0 | 1 | 2 | 3, reasons };
}
