namespace ColonyTracker.Api.Models;

// Thread association for an event under a specific override context.
// Only used when the parent NarrativeEventOverride.OverridesThreads = true.
public class EventOverrideThread
{
    public string EventOverrideId { get; set; } = string.Empty;
    public string NarrativeThreadId { get; set; } = string.Empty;
    public bool IsPrimary { get; set; }
}
