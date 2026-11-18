namespace ColonyTracker.Api.Models;

// This event may resolve differently across the paths of a branch (§14: the event file's `variesBy`).
// Distinct from scope (onPaths) and from versions (variants). Not a table.
public class NarrativeEventVariantParticipation
{
    public string NarrativeEventId { get; set; } = string.Empty;
    public string PathSetId { get; set; } = string.Empty;
}
