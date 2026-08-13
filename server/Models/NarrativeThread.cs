namespace ColonyTracker.Api.Models;

public class NarrativeThread
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string CampaignId { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;
    public string? Summary { get; set; }

    public NarrativeThreadState State { get; set; } = NarrativeThreadState.Open;
}
