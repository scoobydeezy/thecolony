using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Xunit;

namespace ColonyTracker.Api.Tests;

/// <summary>§18.11: a goal's advance Effects are checked when the goal is saved.</summary>
public class GoalAdvanceRulesTests
{
    private static string? Issue(string progressing, string accomplished = "[]") =>
        GoalAdvanceRules.Issue(new FactionGoal { ProgressingEffectsJson = progressing, AccomplishedEffectsJson = accomplished });

    [Fact]
    public void AcceptsTheOrdinaryVocabulary() =>
        Assert.Null(Issue("""[{"targetType":"asset","targetId":"fund","property":"status","delta":0,"value":"Contested"}]""",
            """[{"targetType":"asset","targetId":"fund","property":"controllingFactionId","delta":0,"value":""},{"targetType":"faction","targetId":"seekers","property":"factionSize","delta":-30},{"targetType":"location","targetId":"rest","property":"state","delta":0,"value":"ActiveIncursion"}]"""));

    [Fact]
    public void BlankListsAreEmpty()
    {
        var g = new FactionGoal { ProgressingEffectsJson = "", AccomplishedEffectsJson = " " };
        Assert.Null(GoalAdvanceRules.Issue(g));
        Assert.Equal(("[]", "[]"), (g.ProgressingEffectsJson, g.AccomplishedEffectsJson));
    }

    [Theory]
    [InlineData("not json")]
    [InlineData("""{"targetType":"asset"}""")]
    [InlineData("""[{"targetType":"asset","targetId":"x","property":"tier","delta":1}]""")]
    [InlineData("""[{"targetType":"asset","targetId":"x","property":"status","delta":0,"value":"Ruined"}]""")]
    [InlineData("""[{"targetType":"faction","targetId":"x","property":"factionSize","delta":0}]""")]
    [InlineData("""[{"targetType":"asset","targetId":"","property":"status","delta":0,"value":"Stable"}]""")]
    // 2026-10-26: an advance no longer establishes or ends a World Condition (the condition follows the goal's stage instead)
    [InlineData("""[{"targetType":"condition","targetId":"wc","property":"state","delta":0,"value":"Active"}]""")]
    public void RefusesAnythingElse(string json) => Assert.NotNull(Issue(json));
}
