namespace ColonyTracker.Api.Models;

public class NarrativeEvent
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string CampaignId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public string? Description { get; set; }
    public string? NarrativeFunction { get; set; }
    public NarrativeEventStatus Status { get; set; } = NarrativeEventStatus.Planned;
    public NarrativeVisibility Visibility { get; set; } = NarrativeVisibility.GMOnly;
    public int SortOrder { get; set; } = 0;
}
