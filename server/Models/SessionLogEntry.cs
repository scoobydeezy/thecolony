namespace ColonyTracker.Api.Models;

public class SessionLogEntry
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public int Act { get; set; } = 1;
    public int Week { get; set; } = 1;
    public string? Summary { get; set; }
    public string? PartyActions { get; set; }
    public string? FactionChanges { get; set; }
    public int ColonyStressChange { get; set; } = 0;
    public string? RelationshipBumps { get; set; }
    public string? FutureConsequences { get; set; }
    public string CampaignId { get; set; } = string.Empty;
}
