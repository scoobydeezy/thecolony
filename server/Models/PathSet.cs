namespace ColonyTracker.Api.Models;

public class PathSet
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string CampaignId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? OriginEventId { get; set; }
    public string? ConvergenceEventId { get; set; }
}
