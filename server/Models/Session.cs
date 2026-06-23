namespace ColonyTracker.Api.Models;

public class Session
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public int Number { get; set; }
    public string Title { get; set; } = string.Empty;
    public int Act { get; set; } = 1;
    public int Week { get; set; } = 1;
    public DateTime? Date { get; set; }
    public string? Summary { get; set; }
    public ICollection<Event> Events { get; set; } = new List<Event>();
    public string CampaignId { get; set; } = string.Empty;
}
