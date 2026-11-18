using System.ComponentModel.DataAnnotations.Schema;

namespace ColonyTracker.Api.Models;

public class Faction : ICanonEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string Represents { get; set; } = string.Empty;
    public GroupType Type { get; set; } = GroupType.Faction;
    public string CoreTenet { get; set; } = string.Empty;
    public string? Focus { get; set; }
    public string CertainOf { get; set; } = string.Empty;
    public string RightAbout { get; set; } = string.Empty;
    public string AfraidOf { get; set; } = string.Empty;
    public string WrongAbout { get; set; } = string.Empty;
    public string? Response { get; set; }
    public string? Summary { get; set; }
    public string? Origin { get; set; }
    public string? FoundedAs { get; set; }
    public string? Became { get; set; }
    public string? PublicFace { get; set; }
    public string? SelfImage { get; set; }
    public BeliefPosition? BeliefC { get; set; }
    public BeliefPosition? BeliefA { get; set; }
    public BeliefPosition? BeliefB { get; set; }
    public double TruthValue { get; set; } = 1.0 / 3;
    public double StabilityValue { get; set; } = 1.0 / 3;
    public double AgencyValue { get; set; } = 1.0 / 3;
    public bool Active { get; set; } = true;
    public string? Notes { get; set; }
    public int SortOrder { get; set; } = 0;
    public int Momentum { get; set; } = 0;   // legacy raw Momentum (pre-M3): kept for audit, ignored by the engine
    // M3: operational Momentum, −2..+2 (the operation-roll modifier). Set explicitly as a baseline in Design mode;
    // during a campaign it changes only through capped Momentum resolution.
    public int MomentumTier { get; set; } = 0;
    public int PowerModifier { get; set; } = 0;           // retired (M2): stored, never read
    // §18.8: total membership (named and unnamed), recorded explicitly: ⌊÷ 20⌋ People points. Live-locked, changed in
    // play by `factionSize` Effects. (Was AdditionalMemberCount, unnamed members only; every value was 0 when renamed.)
    // (Base Legitimacy is retired: Mandate, from Symbolic and Mandate Asset stars, is the only authority measure.)
    public int FactionSize { get; set; } = 0;
    public string? Motto { get; set; }
    public string? History { get; set; }
    public string? GlyphPath { get; set; }
    public string? IconPath { get; set; }
    public string? PrimaryColor { get; set; }
    public string? SecondaryColor { get; set; }
    public string? BannerShape { get; set; }
    public string? LeaderId { get; set; }
    public string CampaignId { get; set; } = string.Empty;
    // M1: Live campaigns record when an entity enters the world (absent from replay before this Event).
    public string? IntroducedAtEventId { get; set; }

    // ADVENTURE-BOOK-PLAN.md §10: the canonical file (faction.<slug> under adventure/src/content/factions/).
    // Every property in CanonEntityMapping is read from and saved to that file.
    public string? CanonId { get; set; }
    [NotMapped] public string? CanonVersion { get; set; }
    [NotMapped] public bool CanonMissing { get; set; }
}
