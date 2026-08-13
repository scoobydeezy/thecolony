namespace ColonyTracker.Api.Models;

// Explicit membership: this Event is within the active lifetime of this Path.
// Presence here does not imply the Event has overrides — scope and variation are separate.
public class PathEventScope
{
    public string PathId { get; set; } = string.Empty;
    public string NarrativeEventId { get; set; } = string.Empty;
}
