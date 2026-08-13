namespace ColonyTracker.Api.Models;

public class NarrativeEventRealization
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string NarrativeEventId { get; set; } = string.Empty;
    public string SessionEventId { get; set; } = string.Empty;
    public string? Notes { get; set; }
}
