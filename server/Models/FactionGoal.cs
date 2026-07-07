namespace ColonyTracker.Api.Models;

public class FactionGoal
{
    public string Id { get; set; } = "";
    public string CampaignId { get; set; } = "";
    public string FactionId { get; set; } = "";
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public GoalStatus Status { get; set; } = GoalStatus.Plotting;
    public GoalPriority Priority { get; set; } = GoalPriority.Major;
    public GoalVisibility Visibility { get; set; } = GoalVisibility.Known;

    // Structured target (all optional)
    public GoalTargetEntityType? TargetEntityType { get; set; }
    public string? TargetEntityId { get; set; }
    // Character / Asset: discrete state match
    public string? TargetState { get; set; }
    // Faction: numeric threshold
    public string? TargetProperty { get; set; }      // 'legitimacy' | 'momentum' | 'influence'
    public string? TargetOperator { get; set; }       // 'gte' | 'lte' | 'eq'
    public int? TargetThreshold { get; set; }
}
