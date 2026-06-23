namespace ColonyTracker.Api.Models;

public class Faction
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string Represents { get; set; } = string.Empty;
    public GroupType Type { get; set; } = GroupType.Faction;
    public string CoreTenet { get; set; } = string.Empty;
    public string CertainOf { get; set; } = string.Empty;
    public string RightAbout { get; set; } = string.Empty;
    public string AfraidOf { get; set; } = string.Empty;
    public string WrongAbout { get; set; } = string.Empty;
    public string SingleSentence { get; set; } = string.Empty;
    public BeliefPosition? BeliefC { get; set; }
    public BeliefPosition? BeliefA { get; set; }
    public BeliefPosition? BeliefB { get; set; }
    public double TruthValue { get; set; } = 1.0 / 3;
    public double StabilityValue { get; set; } = 1.0 / 3;
    public double AgencyValue { get; set; } = 1.0 / 3;
    public bool Active { get; set; } = true;
    public string? Notes { get; set; }
    public int SortOrder { get; set; } = 0;
    public int BaseInfluence { get; set; } = 50;
    public int Momentum { get; set; } = 0;
    public int Legitimacy { get; set; } = 50;
    public string CampaignId { get; set; } = string.Empty;
}
