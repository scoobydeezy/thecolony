namespace ColonyTracker.Api.Models;

// One entry of a version's `links` (used when the version's OverridesAssets is true). Not a table: the
// id is derived from the version and the entity. Only authored types (faction, character, Asset, location).
public class EventOverrideEntityLink
{
    public string Id { get; set; } = string.Empty;
    public string EventOverrideId { get; set; } = string.Empty;
    public NarrativeEntityType EntityType { get; set; }
    public string EntityId { get; set; } = string.Empty;
    public string? Role { get; set; }
    public bool IsPrimary { get; set; }
    public NarrativeVisibility Visibility { get; set; } = NarrativeVisibility.GMOnly;
}
