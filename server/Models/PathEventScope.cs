namespace ColonyTracker.Api.Models;

// Explicit membership: this event is within the active lifetime of this path (§14: the event file's
// `onPaths`). Presence does not imply the event has versions. Not a table.
public class PathEventScope
{
    public string PathId { get; set; } = string.Empty;
    public string NarrativeEventId { get; set; } = string.Empty;
}
