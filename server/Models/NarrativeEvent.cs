using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace ColonyTracker.Api.Models;

// ADVENTURE-BOOK-PLAN.md §13: an event (a narrative container) or an encounter (a complex scenario
// with maps, stat blocks, clocks) is a canonical file (event.<slug> under adventure/src/content/events/,
// encounter.<slug> under encounters/). The row keeps Id, CampaignId, CanonId and play data (Status,
// SortOrder for the board); every property in CanonEntityMapping is read from and saved to the file.
public class NarrativeEvent : ICanonEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string CampaignId { get; set; } = string.Empty;
    // Event or Encounter: which kind of file (and folder). Chosen when the item is created.
    [NotMapped] public NarrativeKind Kind { get; set; } = NarrativeKind.Event;
    public string Title { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public string? Description { get; set; }
    public string? NarrativeFunction { get; set; }
    public NarrativeEventStatus Status { get; set; } = NarrativeEventStatus.Planned;
    public NarrativeVisibility Visibility { get; set; } = NarrativeVisibility.GMOnly;
    public int SortOrder { get; set; } = 0;
    // An encounter's event (`event:`), if it belongs to one.
    public string? ParentEventId { get; set; }

    // The file's `leadsTo` and `links` lists, as JSON with row ids. Served through the connection and
    // entity-link endpoints (NarrativeGraph), not as part of the event.
    [JsonIgnore] public string? LeadsToJson { get; set; }
    [JsonIgnore] public string? LinksJson { get; set; }
    // §14: `variesBy` (branch row ids), `onPaths` (path ids) and `variants` (versions), as JSON. Served as
    // participation, scope and override records (NarrativeBranches).
    [JsonIgnore] public string? VariesByJson { get; set; }
    [JsonIgnore] public string? OnPathsJson { get; set; }
    [JsonIgnore] public string? VariantsJson { get; set; }

    public string? CanonId { get; set; }
    [NotMapped] public string? CanonVersion { get; set; }
    [NotMapped] public bool CanonMissing { get; set; }
}
