namespace ColonyTracker.Api.DTOs;

public class RelationshipBreakdownDto
{
    public string SourceId { get; set; } = string.Empty;
    public string TargetId { get; set; } = string.Empty;
    public double BaseScore { get; set; }
    public double StressedScore { get; set; }
    public int ManualBump { get; set; }
    public double FinalScore { get; set; }
    public string Label { get; set; } = string.Empty;
    public RelationshipContributionsDto Contributions { get; set; } = new();
}

public class RelationshipContributionsDto
{
    public double BeliefC { get; set; }
    public double BeliefA { get; set; }
    public double BeliefB { get; set; }
    public double ValueAlignment { get; set; }
    public double ValueConflict { get; set; }
}
