namespace ColonyTracker.Api.Models;

// Explicit record that a NarrativeEvent may resolve differently across Paths
// belonging to a specific PathSet.
//
// Distinct from PathEventScope (the timeline passes through this event) and
// from NarrativeEventOverride (a concrete property patch for a specific path context).
// An event can be in scope and not participate in variation, or participate but
// have no overrides yet (all paths still inheriting base values).
public class NarrativeEventVariantParticipation
{
    public string NarrativeEventId { get; set; } = string.Empty;
    public string PathSetId { get; set; } = string.Empty;
}
