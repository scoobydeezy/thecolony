namespace ColonyTracker.Api.Models;

public class Campaign
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = "New Campaign";
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    // M1 lifecycle: Design (baseline and rules freely editable) or Live (baseline simulation fields locked,
    // rules versioned, changes recorded as Events). Activation is one-way.
    public CampaignMode Mode { get; set; } = CampaignMode.Design;
    public DateTime? ActivatedAt { get; set; }
    // Monotonic counter bumped by every write that can affect simulation state (stale-state guard).
    public long HistoryVersion { get; set; }
}
