namespace ColonyTracker.Api.Models;

public class Faction
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
    public int Momentum { get; set; } = 0;
    public int BaseLegitimacy { get; set; } = 50;
    public int PowerModifier { get; set; } = 0;
    public string? Motto { get; set; }
    public string? History { get; set; }
    public string? GlyphPath { get; set; }
    public string? IconPath { get; set; }
    public string? PrimaryColor { get; set; }
    public string? SecondaryColor { get; set; }
    public string CampaignId { get; set; } = string.Empty;
}
