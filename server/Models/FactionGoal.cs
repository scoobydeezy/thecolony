namespace ColonyTracker.Api.Models;

public class FactionGoal
{
    public string Id { get; set; } = "";
    public string CampaignId { get; set; } = "";
    public string FactionId { get; set; } = "";
    public string Title { get; set; } = "";
    public GoalStatus Status { get; set; } = GoalStatus.Plotting;
    public GoalConditionType ConditionType { get; set; } = GoalConditionType.Achieve;
    public GoalPriority Priority { get; set; } = GoalPriority.Major;
    public GoalVisibility Visibility { get; set; } = GoalVisibility.Known;

    // Structured target (all optional)
    public GoalTargetEntityType? TargetEntityType { get; set; }
    public string? TargetEntityId { get; set; }
    // Character / Asset: discrete state match
    public string? TargetState { get; set; }
    // Asset: ownership — which faction must control the asset
    public string? TargetOwnerFactionId { get; set; }
    // Champion: primary character stakeholder for this goal
    public string? ChampionId { get; set; }
    // Faction: numeric threshold
    public string? TargetProperty { get; set; }      // 'legitimacy' | 'momentum' | 'influence'
    public string? TargetOperator { get; set; }       // 'gte' | 'lte' | 'eq'
    public int? TargetThreshold { get; set; }
}
