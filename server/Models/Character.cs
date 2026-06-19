namespace ColonyTracker.Api.Models;

public class Character
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public CharacterType CharacterType { get; set; } = CharacterType.NPC;

    // Pathfinder fields (optional, primarily for party members)
    public string? Ancestry { get; set; }
    public string? Heritage { get; set; }
    public string? Class { get; set; }
    public string? Background { get; set; }
    public int? Level { get; set; }

    // Demographics
    public string? Gender { get; set; }
    public int? Age { get; set; }
    public string? Occupation { get; set; }

    // Narrative
    public string? Summary { get; set; }
    public string? Goals { get; set; }
    public string? Fears { get; set; }
    public string? Notes { get; set; }

    // Group membership (both optional)
    public string? FactionId { get; set; }
    public string? SocialClassId { get; set; }

    // Personal value vector (sum = 1)
    public double TruthValue { get; set; } = 1.0 / 3;
    public double StabilityValue { get; set; } = 1.0 / 3;
    public double AgencyValue { get; set; } = 1.0 / 3;

    // Belief overrides (null = derive from values)
    public BeliefPosition? BeliefC { get; set; }
    public BeliefPosition? BeliefA { get; set; }
    public BeliefPosition? BeliefB { get; set; }

    // Doubt system
    public DoubtDirection? DoubtDirection { get; set; }
    public int Conviction { get; set; } = 50;
    public int Pressure { get; set; } = 0;

    // Influence system
    public int Influence { get; set; } = 0;       // 0–100: how much this character stabilizes faction-mates
    public int Impressionable { get; set; } = 50;  // 0–100: how strongly this character is affected by others' influence

    // Narrative state
    public CharacterState State { get; set; } = CharacterState.Alive;
}
