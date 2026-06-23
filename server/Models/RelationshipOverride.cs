namespace ColonyTracker.Api.Models;

public class RelationshipOverride
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string SourceId { get; set; } = string.Empty;
    public string TargetId { get; set; } = string.Empty;
    public int ScoreBump { get; set; } = 0;
    public string? Notes { get; set; }
    public string CampaignId { get; set; } = string.Empty;
}
