namespace ColonyTracker.Api.Models;

public class NarrativeEntityLink
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string CampaignId { get; set; } = string.Empty;
    public NarrativeOwnerType OwnerType { get; set; }
    public string OwnerId { get; set; } = string.Empty;
    public NarrativeEntityType EntityType { get; set; }
    public string EntityId { get; set; } = string.Empty;
    public string? Role { get; set; }
    public string? Notes { get; set; }
    public bool IsPrimary { get; set; }
    public NarrativeVisibility Visibility { get; set; } = NarrativeVisibility.GMOnly;
}
