using System.ComponentModel.DataAnnotations.Schema;

namespace ColonyTracker.Api.Models;

public class Character : ICanonEntity
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

    // Narrative tier
    public NarrativeTier NarrativeTier { get; set; } = NarrativeTier.Minor;

    // Demographics
    public string? Gender { get; set; }
    public string? Pronouns { get; set; }
    public int? Age { get; set; }
    public string? Occupation { get; set; }
    public string? Aliases { get; set; }

    // Narrative
    public string? Summary { get; set; }

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

    // Portrait image
    public string? PortraitPath { get; set; }

    // Narrative state
    public CharacterState State { get; set; } = CharacterState.Alive;
    public string CampaignId { get; set; } = string.Empty;

    // Spatial location
    public string? LocationId { get; set; }
    // M1: Live campaigns record when an entity enters the world (absent from replay before this Event).
    public string? IntroducedAtEventId { get; set; }
    // M6 (BOARD-GAME-REVIEW §17.3, §17.5): proximity to a Defection Check. Changes only through Effects (Character Phase,
    // Settling, the Defection Check, or play). Reaffirmed: a lasting eligibility marker for the faction it was earned in.
    public CharacterInstability Instability { get; set; } = CharacterInstability.Stable;
    public string? ReaffirmedFactionId { get; set; }

    // ADVENTURE-BOOK-PLAN.md §9: the character's canonical file (e.g. npc.kelda-varruk under
    // adventure/src/content/npcs/). Every property listed in CanonCharacterMapping.CanonProperties
    // is read from and saved to that file; this table keeps only Id, CampaignId, CanonId and
    // IntroducedAtEventId. Several campaigns may link to the same file.
    public string? CanonId { get; set; }

    // Version of the file this character was loaded from. The client sends it back on save; a save
    // is refused if the file changed in between (e.g. edited in VS Code).
    [NotMapped] public string? CanonVersion { get; set; }

    // True when CanonId points at a file that is missing or unreadable; such a character can't be saved.
    [NotMapped] public bool CanonMissing { get; set; }

    // ADVENTURE-BOOK-PLAN.md §15: the file's `relationships`, as JSON with row ids. Served as
    // CharacterRelationship records (CharacterRelations).
    [System.Text.Json.Serialization.JsonIgnore] public string? RelationshipsJson { get; set; }
}
