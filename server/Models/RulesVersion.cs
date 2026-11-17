namespace ColonyTracker.Api.Models;

/// <summary>
/// Immutable snapshot of a campaign's rules, effective from a named Event onward (M1).
/// Version 1 is written at activation. Calculation semantics are pinned by EngineVersion.
/// </summary>
public class RulesVersion
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string CampaignId { get; set; } = string.Empty;
    public int Version { get; set; }
    public string RulesJson { get; set; } = string.Empty;
    public string EngineVersion { get; set; } = string.Empty;
    public string? EffectiveFromEventId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
