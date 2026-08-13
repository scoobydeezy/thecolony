namespace ColonyTracker.Api.Models;

public class NarrativeThreadEvent
{
    public string NarrativeThreadId { get; set; } = string.Empty;
    public string NarrativeEventId { get; set; } = string.Empty;
    public bool IsPrimary { get; set; }
}
