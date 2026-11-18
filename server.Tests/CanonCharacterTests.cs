using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services.Canon;

namespace ColonyTracker.Api.Tests;

// ADVENTURE-BOOK-PLAN.md §9: the API's reader for canonical character files.
public class CanonCharacterTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), $"canon-test-{Guid.NewGuid():N}");

    public CanonCharacterTests() => Directory.CreateDirectory(Path.Combine(_dir, "npcs"));
    public void Dispose() => Directory.Delete(_dir, recursive: true);

    private const string Kelda = """
        ---
        # yaml-language-server: $schema=../../../schemas/npc.schema.json
        id: npc.kelda-varruk
        slug: kelda-varruk
        name: Kelda Varruk
        title: Captain
        role: Captain of the Guard
        ancestry: Dwarf
        class: Fighter
        level: 13
        age: 112
        aliases:
          - Doors
        narrativeTier: Major
        start:
          faction: keepers
          state: Alive
          values:
            truth: 0.6506540826617453
            stability: 0.25
            agency: 0.0993459173382547
          beliefs:
            b: Negative
          doubt: AB
          conviction: 75
          pressure: 65
        ---

        ## Overview

        The Captain commands the Colony’s guard.
        She is loyal to the Order.

        ## Relationship to the Order

        :::player-facing
        She respects hierarchy.
        :::

        ## Methods

        ```text
        ## not a heading inside a fence
        ```
        Holds the line.
        """;

    [Fact]
    public void Parses_identity_start_values_and_sections()
    {
        var c = CanonCharacterReader.Parse(Kelda, "kelda.md", "npc");
        Assert.Equal("npc.kelda-varruk", c.Id);
        Assert.Equal(("Kelda Varruk", "Captain", "Captain of the Guard", "Dwarf", "Fighter", 13, 112), (c.Name, c.Title, c.Role, c.Ancestry, c.Class, c.Level, c.Age));
        Assert.Equal(["Doors"], c.Aliases);
        Assert.NotNull(c.Start);
        Assert.Equal(0.6506540826617453, c.Start!.Truth);   // exact double, not rounded
        Assert.Equal(("keepers", "Negative", (string?)null, "AB", 75, 65, 50), (c.Start.Faction, c.Start.BeliefB, c.Start.BeliefA, c.Start.Doubt, c.Start.Conviction, c.Start.Pressure, c.Start.Impressionable));

        Assert.Equal(["overview", "relationship-to-the-order", "methods"], c.Sections.Select(s => s.Key));
        Assert.Equal("gm", c.Sections[0].Audience);
        Assert.Equal(("players", "She respects hierarchy."), (c.Sections[1].Audience, c.Sections[1].Body));
        Assert.Contains("## not a heading inside a fence", c.Sections[2].Body);
    }

    [Theory]
    [InlineData("Testing the Party’s Answer", "testing-the-partys-answer")]
    [InlineData("Pilgrim’s Rest", "pilgrims-rest")]
    [InlineData("The Name — GM Truth, Hidden Until Sunny", "the-name--gm-truth-hidden-until-sunny")]
    [InlineData("Act II Monitoring and the Confluence", "act-ii-monitoring-and-the-confluence")]
    public void Slug_matches_github_slugger(string heading, string expected) => Assert.Equal(expected, CanonText.Slug(heading));

    [Fact]
    public void Normalize_ignores_quotes_emphasis_bullets_and_whitespace()
    {
        Assert.True(CanonText.Same("**Everyone** inside the Colony’s walls.", "Everyone inside the Colony's   walls."));
        Assert.True(CanonText.Same("Objects can:\n• Trigger memory.\n• Draw people.", "Objects can:\n* Trigger memory.\n* Draw people."));
        Assert.False(CanonText.Same("Shattered Instigator", "Shattered Field Operative"));
    }

    [Fact]
    public void A_broken_file_is_reported_not_thrown()
    {
        File.WriteAllText(Path.Combine(_dir, "npcs", "good.md"), Kelda);
        File.WriteAllText(Path.Combine(_dir, "npcs", "broken.md"), "no frontmatter here");
        var (chars, errors) = CanonCharacterReader.LoadDirectory(_dir);
        Assert.Single(chars);
        Assert.Single(errors);
        Assert.EndsWith("broken.md", errors[0].File);
    }
}
