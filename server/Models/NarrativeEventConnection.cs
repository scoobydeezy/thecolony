namespace ColonyTracker.Api.Models;

public class NarrativeEventConnection
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string CampaignId { get; set; } = string.Empty;
    public string SourceNarrativeEventId { get; set; } = string.Empty;
    public string TargetNarrativeEventId { get; set; } = string.Empty;
    public string? Label { get; set; }
    public NarrativeVisibility Visibility { get; set; } = NarrativeVisibility.GMOnly;
}
