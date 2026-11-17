namespace ColonyTracker.Api.Models;

/// <summary>
/// One Colony Turn: the complete simulation between two sessions (M1 record; procedure arrives in M5).
/// Recorded as an Event of Kind ColonyTurn (SortOrder 0) in the session it prepares.
/// </summary>
public class ColonyTurn
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string CampaignId { get; set; } = string.Empty;
    public string SessionId { get; set; } = string.Empty;
    public string EventId { get; set; } = string.Empty;
    public long Seed { get; set; }
    public ColonyTurnStatus Status { get; set; } = ColonyTurnStatus.Draft;
    public string? RulesVersionId { get; set; }
    public string EngineVersion { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CommittedAt { get; set; }
    public ICollection<ColonyTurnPhase> Phases { get; set; } = new List<ColonyTurnPhase>();
}

/// <summary>One ordered phase of a Colony Turn. Each commits in its own transaction and freezes the previous output.</summary>
public class ColonyTurnPhase
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ColonyTurnId { get; set; } = string.Empty;
    public int Ordinal { get; set; }
    public ColonyTurnPhaseKind Kind { get; set; }
    public ColonyTurnStatus Status { get; set; } = ColonyTurnStatus.Committed;
    public string FrozenInputsJson { get; set; } = "{}";
    public string FrozenInputsHash { get; set; } = string.Empty;   // SHA-256 (hex) of FrozenInputsJson, verified at commit
    public string ResultsJson { get; set; } = "{}";
    public long HistoryVersion { get; set; }                       // campaign history version the phase was computed from
    public DateTime CommittedAt { get; set; } = DateTime.UtcNow;
}
