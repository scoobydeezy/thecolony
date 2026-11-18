namespace ColonyTracker.Api.Services.Canon;

// A character as stored in its canonical content file (adventure/src/content/npcs|pcs/*.md,
// ADVENTURE-BOOK-PLAN.md §9). Frontmatter carries identity and starting values; the Markdown
// body carries profile and detail sections as "## Heading" blocks.
public sealed class CanonCharacter
{
    public required string Id { get; init; }             // npc.kelda-varruk / pc.vic-the-houseless
    public required string Kind { get; init; }           // "npc" | "pc"
    public required string File { get; init; }
    public string Name { get; init; } = "";
    public string? Title { get; init; }
    public string? Role { get; init; }
    public string? Ancestry { get; init; }
    public string? Heritage { get; init; }
    public string? Class { get; init; }
    public string? Background { get; init; }
    public int? Level { get; init; }
    public string? Gender { get; init; }
    public string? Pronouns { get; init; }
    public int? Age { get; init; }
    public IReadOnlyList<string> Aliases { get; init; } = [];
    public string? Summary { get; init; }
    public string? Portrait { get; init; }
    public string NarrativeTier { get; init; } = "Minor";
    public string Origin { get; init; } = "prepared";
    public CanonStart? Start { get; init; }
    public IReadOnlyList<CanonSection> Sections { get; init; } = [];
}

public sealed class CanonStart
{
    public string? Faction { get; init; }
    public string? SocialClass { get; init; }
    public string? Location { get; init; }
    public string State { get; init; } = "Alive";
    public string Instability { get; init; } = "Stable";
    public string? ReaffirmedFaction { get; init; }
    public double Truth { get; init; }
    public double Stability { get; init; }
    public double Agency { get; init; }
    public string? BeliefA { get; init; }
    public string? BeliefB { get; init; }
    public string? BeliefC { get; init; }
    public string? Doubt { get; init; }
    public int Conviction { get; init; } = 50;
    public int Pressure { get; init; }
    public int Influence { get; init; }
    public int Impressionable { get; init; } = 50;
}

// "players" when the section body is wrapped in :::player-facing, otherwise "gm".
public sealed record CanonSection(string Heading, string Key, string Body, string Audience);

public sealed record CanonLoadError(string File, string Message);
