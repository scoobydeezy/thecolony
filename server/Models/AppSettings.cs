namespace ColonyTracker.Api.Models;

public class AppSettings
{
    public string Id { get; set; } = "singleton";
    public string ActiveCampaignId { get; set; } = string.Empty;
    public Campaign? ActiveCampaign { get; set; }
}
