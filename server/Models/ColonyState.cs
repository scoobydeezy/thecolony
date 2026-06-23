namespace ColonyTracker.Api.Models;

public class ColonyState
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string PartyName { get; set; } = "The Party";
    public int Act { get; set; } = 1;
    public int Week { get; set; } = 1;
    public int ColonyStress { get; set; } = 0;

    // Party / Party State
    public BeliefPosition PartyBeliefC { get; set; } = BeliefPosition.Neutral;
    public BeliefPosition PartyBeliefA { get; set; } = BeliefPosition.Neutral;
    public BeliefPosition PartyBeliefB { get; set; } = BeliefPosition.Positive;
    public double PartyTruthValue { get; set; } = 0.6;
    public double PartyStabilityValue { get; set; } = 0.25;
    public double PartyAgencyValue { get; set; } = 0.15;

    public string? SessionSummary { get; set; }
    public string? DominantFactions { get; set; }
    public string? InfluenceNotes { get; set; }
    public string? MajorConsequences { get; set; }
    public string CampaignId { get; set; } = string.Empty;
}
