namespace ColonyTracker.Api.Models;

// One entry of a version's `leadsTo` (used when the version's OverridesConnections is true). Not a
// table: the id is derived from the version, target and thread.
public class EventOverrideConnection
{
    public string Id { get; set; } = string.Empty;
    public string EventOverrideId { get; set; } = string.Empty;
    public string TargetNarrativeEventId { get; set; } = string.Empty;
    public string ThreadId { get; set; } = string.Empty;
    public NarrativeVisibility Visibility { get; set; } = NarrativeVisibility.GMOnly;
}
