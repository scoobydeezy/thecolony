namespace ColonyTracker.Api.Models;

// What an event or thread involves. A link to a faction, character, Asset or location is authored:
// one entry of the owner's `links` list in its file (NarrativeGraph builds these, with an id derived
// from the owner and the entity). A link to a session or session event is play data and is a row here.
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

    public static bool IsAuthored(NarrativeEntityType t) => t is NarrativeEntityType.Faction or NarrativeEntityType.Character or NarrativeEntityType.Asset or NarrativeEntityType.Location;
}
