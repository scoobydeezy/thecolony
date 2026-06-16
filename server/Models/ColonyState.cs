namespace ColonyTracker.Api.Models;

public class ColonyState
{
    public string Id { get; set; } = "singleton";
    public string PartyName { get; set; } = "The Party";
    public int Act { get; set; } = 1;
    public int Week { get; set; } = 1;
    public int ColonyStress { get; set; } = 0;

    // Party / Party State
    public RitualPosition PartyRitual { get; set; } = RitualPosition.Neutral;
    public KnowledgePosition PartyKnowledge { get; set; } = KnowledgePosition.Controlled;
    public ChangePosition PartyChange { get; set; } = ChangePosition.Yes;
    public double PartyTruthValue { get; set; } = 0.6;
    public double PartyStabilityValue { get; set; } = 0.25;
    public double PartyAgencyValue { get; set; } = 0.15;

    public string? SessionSummary { get; set; }
    public string? DominantFactions { get; set; }
    public string? InfluenceNotes { get; set; }
    public string? MajorConsequences { get; set; }
}
