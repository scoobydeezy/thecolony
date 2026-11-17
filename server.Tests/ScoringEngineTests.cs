using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;

namespace ColonyTracker.Api.Tests;

/// <summary>Server ScoringEngine must match client scoring.service.ts (SCORING-AUDIT.md). Expected values come from the client.</summary>
public class ScoringEngineTests
{
    private static readonly ScoringEngine Engine = new();
    private static readonly RulesConfig Rules = new();   // provisional defaults, identical to client DEFAULT_RULES

    private static Faction F(string id, double a, double b, double c, BeliefPosition? ba, BeliefPosition? bb, BeliefPosition? bc) =>
        new() { Id = id, Name = id, TruthValue = a, StabilityValue = b, AgencyValue = c, BeliefA = ba, BeliefB = bb, BeliefC = bc };

    private static readonly Faction Order  = F("order", 0.12, 0.88, 0, BeliefPosition.Negative, BeliefPosition.Negative, BeliefPosition.Positive);
    private static readonly Faction Egress = F("egress", 0.44, 0.34, 0.22, BeliefPosition.Neutral, BeliefPosition.Negative, BeliefPosition.Neutral);
    private static readonly Faction Zealot = F("z", 1, 0, 0, BeliefPosition.Positive, BeliefPosition.Neutral, BeliefPosition.Positive);
    private static readonly Faction Centre = F("m", 0.34, 0.33, 0.33, BeliefPosition.Neutral, BeliefPosition.Neutral, BeliefPosition.Neutral);

    [Theory]
    [InlineData("order", "egress", 0, -0.3, -0.3, "Tolerated", -0.2, -0.2, 1.8, -0.3, -1.4)]
    [InlineData("egress", "order", 5, -0.6, -0.9, "Tolerated", -0.3, -0.4, 1.0, -0.3, -0.6)]
    [InlineData("z", "m", 0, -3.4, -3.4, "Opposed", -0.2, -0.7, 0.5, -1.1, -2.0)]
    public void Matches_the_client_formula(string s, string t, int stress, double baseScore, double stressed, string label,
        double bc, double ba, double bb, double sim, double opp)
    {
        var all = new[] { Order, Egress, Zealot, Centre }.ToDictionary(f => f.Id);
        var r = Engine.ScoreRelationship(all[s], all[t], stress, 0, Rules);
        Assert.Equal(baseScore, r.BaseScore);
        Assert.Equal(stressed, r.StressedScore);
        Assert.Equal(label, r.Label);
        Assert.Equal(bc, r.Contributions.BeliefC);
        Assert.Equal(ba, r.Contributions.BeliefA);
        Assert.Equal(bb, r.Contributions.BeliefB);
        Assert.Equal(sim, r.Contributions.ValueSimilarity);
        Assert.Equal(opp, r.Contributions.ValueOpposition);
    }

    [Fact]
    public void An_identical_twin_is_Aligned_even_at_the_centre_and_purists_resent_the_lukewarm()
    {
        Assert.Equal("Aligned", Engine.ScoreRelationship(Centre, Centre, 0, 0, Rules).Label);
        Assert.True(Engine.ScoreRelationship(Zealot, Centre, 0, 0, Rules).BaseScore
                  < Engine.ScoreRelationship(Centre, Zealot, 0, 0, Rules).BaseScore);
    }
}
