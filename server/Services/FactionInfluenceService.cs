using ColonyTracker.Api.Models;

namespace ColonyTracker.Api.Services;

public interface IFactionInfluenceService
{
    double CalculateCharacterInfluence(IEnumerable<Character> members);
    int CalculateTotalInfluence(Faction faction, IEnumerable<Character> members);
}

public class FactionInfluenceService : IFactionInfluenceService
{
    /// <summary>
    /// characterInfluence = (avg * 0.6) + (max * 0.4)
    /// Returns 0 when the faction has no members.
    /// </summary>
    public double CalculateCharacterInfluence(IEnumerable<Character> members)
    {
        var list = members.ToList();
        if (list.Count == 0) return 0;

        var avg = list.Average(c => (double)c.Influence);
        var max = list.Max(c => (double)c.Influence);
        return avg * 0.6 + max * 0.4;
    }

    /// <summary>
    /// totalInfluence = (baseInfluence * 0.45) + (characterInfluence * 0.35) + (normalizedMomentum * 0.20)
    /// normalizedMomentum = 50 + (momentum / 2)  →  range 0–100
    /// Result is rounded to the nearest integer, clamped to 0–100.
    /// </summary>
    public int CalculateTotalInfluence(Faction faction, IEnumerable<Character> members)
    {
        var charInfluence      = CalculateCharacterInfluence(members);
        var normalizedMomentum = 50.0 + faction.Momentum / 2.0;

        var raw =
            faction.BaseInfluence * 0.45
            + charInfluence       * 0.35
            + normalizedMomentum  * 0.20;

        return Math.Clamp((int)Math.Round(raw), 0, 100);
    }
}
