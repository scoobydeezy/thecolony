namespace ColonyTracker.Api.Models;

public class ColonyMap
{
    public string Id { get; set; } = "";
    public string CampaignId { get; set; } = "";
    public string Name { get; set; } = "";
    public string? LocationId { get; set; }
    public string? ImagePath { get; set; }
    public int ImageWidth { get; set; }
    public int ImageHeight { get; set; }
    public bool IsHero { get; set; } = false;
}
