namespace ColonyTracker.Api.Models;

public class Asset
{
    public string Id { get; set; } = "";
    public string CampaignId { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public AssetType Type { get; set; } = AssetType.Infrastructure;
    public AssetRole Role { get; set; } = AssetRole.Operational;
    public int Tier { get; set; } = 3;
    public bool Keystone { get; set; } = false;
    public string? ControllingFactionId { get; set; }
    public string? Location { get; set; }
    public AssetStatus Status { get; set; } = AssetStatus.Stable;
    public string? StatusActorFactionId { get; set; }
}
