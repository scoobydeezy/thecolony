namespace ColonyTracker.Api.Models;

public class ColonyState
{
    public string Id { get; set; } = "singleton";
    public string PartyName { get; set; } = "Darkwing";
    public int Act { get; set; } = 1;
    public int Week { get; set; } = 1;
    public int ColonyStress { get; set; } = 0;

    // Darkwing / Party State
    public RitualPosition DarkwingRitual { get; set; } = RitualPosition.Neutral;
    public KnowledgePosition DarkwingKnowledge { get; set; } = KnowledgePosition.Controlled;
    public ChangePosition DarkwingChange { get; set; } = ChangePosition.Yes;
    public double DarkwingTruthValue { get; set; } = 0.6;
    public double DarkwingStabilityValue { get; set; } = 0.25;
    public double DarkwingAgencyValue { get; set; } = 0.15;

    public string? SessionSummary { get; set; }
    public string? DominantFactions { get; set; }
    public string? InfluenceNotes { get; set; }
    public string? MajorConsequences { get; set; }
}
