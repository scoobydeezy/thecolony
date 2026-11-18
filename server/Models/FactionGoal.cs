using System.ComponentModel.DataAnnotations.Schema;

namespace ColonyTracker.Api.Models;

public class FactionGoal : ICanonEntity
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
    // M1: Live campaigns record when an entity enters the world (absent from replay before this Event).
    public string? IntroducedAtEventId { get; set; }

    // M4 (simplified 2026-10-15): Achieve goals only. A Goal defines a desired world change; the Colony Turn decides
    // whether progress occurs; an Event records what actually happened.
    // Auto-Resolve: Automatic = the second success writes the target and Accomplishes the goal; Adjudicated = it raises
    // a GM resolution task (Ready to Resolve) instead.
    public GoalOutcomeMode OutcomeMode { get; set; } = GoalOutcomeMode.Automatic;
    // §18.11: explicit Effects the Faction Phase writes when this goal advances (JSON arrays of
    // { targetType, targetId, property, delta, value }, ordinary Effect vocabulary only; see GoalAdvanceRules).
    // What becomes true in words is not stored here (2026-10-26): it is the text of the World Conditions that vary by,
    // or require, the goal's stage.
    public string ProgressingEffectsJson { get; set; } = "[]";    // at Planning → Progressing
    public string AccomplishedEffectsJson { get; set; } = "[]";   // at Accomplished, after the target
    // §18.6: the first Act in which the faction may pursue it in the Faction Phase (1–3). Eligibility only: Session
    // Events, the Goal Detector and GM resolutions are never restricted by it.
    public int EarliestAct { get; set; } = 2;

    // ADVENTURE-BOOK-PLAN.md §11: the canonical file (goal.<slug> under adventure/src/content/goals/).
    // Every property in CanonEntityMapping is read from and saved to that file.
    public string? CanonId { get; set; }
    [NotMapped] public string? CanonVersion { get; set; }
    [NotMapped] public bool CanonMissing { get; set; }
}
