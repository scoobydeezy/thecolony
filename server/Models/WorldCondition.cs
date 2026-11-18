namespace ColonyTracker.Api.Models;

/// <summary>
/// §18.6/§18.9: a persistent rule or circumstance the party can encounter. The app tracks whether it is in force and why;
/// it never executes the rule. In force ⇔ established (from the start, or by an Event's condition effect, until one ends it)
/// ∧ every requirement holds. Requirements are typed predicates over RECORDED entity state only (Asset controller and
/// status; character state and faction; faction leader capable; Location state; another condition in force), never over a
/// value that depends on Colony Stress. An in-force condition may add to Colony Stress. Evaluated by client replay
/// (core/sim/conditions.ts).
/// </summary>
public class WorldCondition : ICanonEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string CampaignId { get; set; } = "";
    public string Title { get; set; } = "";
    public string Rule { get; set; } = "";              // the rule as stated at the table (while in force)
    public string? RuleOtherwise { get; set; }          // optional: what holds at the table while it is NOT in force
    public string? VariesByJson { get; set; }           // 2026-10-26: one entity's property with a row per state (client conditions.ts)
    public bool ActiveAtStart { get; set; } = true;      // established at the baseline (else only by an Event)
    /// <summary>JSON array of requirements, all of which must hold, e.g.
    /// [{"kind":"assetController","assetId":"…","factionId":"aspis"},{"kind":"condition","conditionId":"…","inForce":true}].</summary>
    public string RequirementsJson { get; set; } = "[]";
    public int StressContribution { get; set; }          // added to Colony Stress while in force (may be negative)
    public int SortOrder { get; set; }                   // presentation order: stays in the row

    // ADVENTURE-BOOK-PLAN.md §15: the canonical file (condition.<slug> under adventure/src/content/conditions/).
    // Every property in CanonEntityMapping is read from and saved to it; ids in RequirementsJson and
    // VariesByJson are row ids here and canonical ids in the file.
    public string? CanonId { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.NotMapped] public string? CanonVersion { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.NotMapped] public bool CanonMissing { get; set; }
}
