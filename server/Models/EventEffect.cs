using System.Text.Json.Serialization;

namespace ColonyTracker.Api.Models;

public class EventEffect
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string EventId { get; set; } = string.Empty;
    public string TargetType { get; set; } = string.Empty;  // "colony", "faction", "character"
    public string TargetId { get; set; } = string.Empty;
    public string Property { get; set; } = string.Empty;    // e.g. "momentum", "pressure", "stress"
    public double Delta { get; set; }
    // For non-numeric effects (state, factionChange) — stores the new string value
    public string? Value { get; set; }
    // For two-party effects (relationshipBump, partyRelationshipBump) — the second faction/target
    public string? SecondaryTargetId { get; set; }
    // For asset status changes — the faction responsible for the state change
    public string? ActorFactionId { get; set; }
    // M1: provenance and explicit order within the Event
    public EffectOrigin Origin { get; set; } = EffectOrigin.Manual;
    public int Ordinal { get; set; }
    public string? PhaseId { get; set; }
    [JsonIgnore]
    public Event? Event { get; set; }
}
