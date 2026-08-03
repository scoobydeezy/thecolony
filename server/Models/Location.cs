namespace ColonyTracker.Api.Models;

public class Location
{
    public string Id { get; set; } = "";
    public string CampaignId { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string? ParentLocationId { get; set; }
    public LocationState State { get; set; } = LocationState.Active;
    public string? LinkedAssetId { get; set; }
    public string? LocationType { get; set; }
    public string? MarkerColor { get; set; }
}
