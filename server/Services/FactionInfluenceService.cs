using ColonyTracker.Api.Models;

namespace ColonyTracker.Api.Services;

public interface IFactionInfluenceService
{
    double CalculateCharacterStrength(IEnumerable<Character> members, int additionalMemberCount = 0);
    int CalculateOrganization(Faction faction, IEnumerable<Character> members);
    int CalculateLegitimacy(Faction faction);
    int CalculateEffectivePower(Faction faction, IEnumerable<Character> members);
}

public class FactionInfluenceService : IFactionInfluenceService
{
    private const double AdditionalMemberBaseInfluence = 30.0;

    // CharacterStrength = (avg * 0.6) + (max * 0.4); leaderless penalty applied here.
    // additionalMemberCount pads the pool with baseline-strength generics so large factions
    // don't require fully populating every member to model their mass accurately.
    public double CalculateCharacterStrength(IEnumerable<Character> members, int additionalMemberCount = 0)
    {
        var list = members.ToList();
        var totalCount = list.Count + additionalMemberCount;
        if (totalCount == 0) return 0;

        var representedSum = list.Sum(c => (double)c.Influence);
        var additionalSum  = additionalMemberCount * AdditionalMemberBaseInfluence;
        var avg = (representedSum + additionalSum) / totalCount;
        var max = list.Count > 0 ? list.Max(c => (double)c.Influence) : AdditionalMemberBaseInfluence;
        var raw = avg * 0.6 + max * 0.4;

        var hasLeader = list.Any(c => c.CharacterType == CharacterType.FactionLeader);
        return raw * (hasLeader ? 1.0 : 0.75);
    }

    // Organization = CharacterStrength×0.40 + NormalizedMomentum×0.20
    // (asset weights omitted server-side — assets are scored client-side)
    // normalizedMomentum = 50 + (momentum / 2)
    public int CalculateOrganization(Faction faction, IEnumerable<Character> members)
    {
        var charStrength       = CalculateCharacterStrength(members, faction.AdditionalMemberCount);
        var normalizedMomentum = 50.0 + faction.Momentum / 2.0;

        var raw =
            charStrength       * 0.40
            + normalizedMomentum * 0.20;

        return Math.Clamp((int)Math.Round(raw), 0, 100);
    }

    // Legitimacy = BaseLegitimacy×0.70
    // (asset legitimacy omitted server-side — assets scored client-side)
    public int CalculateLegitimacy(Faction faction)
    {
        var raw = faction.BaseLegitimacy * 0.70;
        return Math.Clamp((int)Math.Round(raw), 0, 100);
    }

    // Power = Organization × (0.5 + Legitimacy / 100) + PowerModifier
    public int CalculateEffectivePower(Faction faction, IEnumerable<Character> members)
    {
        var organization = CalculateOrganization(faction, members);
        var legitimacy   = CalculateLegitimacy(faction);
        var legitimacyMultiplier = 0.5 + legitimacy / 100.0;
        return (int)Math.Round(organization * legitimacyMultiplier + faction.PowerModifier);
    }
}
