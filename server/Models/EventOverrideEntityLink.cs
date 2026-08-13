namespace ColonyTracker.Api.Models;

// Entity association (asset, character, faction, etc.) for an event under a specific override context.
// Only used when the parent NarrativeEventOverride.OverridesAssets = true.
public class EventOverrideEntityLink
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string EventOverrideId { get; set; } = string.Empty;
    public NarrativeEntityType EntityType { get; set; }
    public string EntityId { get; set; } = string.Empty;
    public string? Role { get; set; }
    public bool IsPrimary { get; set; }
    public NarrativeVisibility Visibility { get; set; } = NarrativeVisibility.GMOnly;
}
