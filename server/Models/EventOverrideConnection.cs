namespace ColonyTracker.Api.Models;

// Outgoing connection from an event when a specific override is active.
// Only used when the parent NarrativeEventOverride.OverridesConnections = true.
public class EventOverrideConnection
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string EventOverrideId { get; set; } = string.Empty;
    public string TargetNarrativeEventId { get; set; } = string.Empty;
    public string? Label { get; set; }
    public NarrativeVisibility Visibility { get; set; } = NarrativeVisibility.GMOnly;
}
