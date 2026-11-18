using System.ComponentModel.DataAnnotations.Schema;

namespace ColonyTracker.Api.Models;

public class Location : ICanonEntity
{
    public string Id { get; set; } = "";
    public string CampaignId { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string? ParentLocationId { get; set; }
    public LocationState State { get; set; } = LocationState.Stable;
    public string? LinkedAssetId { get; set; }
    public string? LocationType { get; set; }
    public string? MarkerColor { get; set; }
    // M1: Live campaigns record when an entity enters the world (absent from replay before this Event).
    public string? IntroducedAtEventId { get; set; }

    // ADVENTURE-BOOK-PLAN.md §10: the canonical file (location.<slug> under adventure/src/content/locations/).
    // Every property in CanonEntityMapping is read from and saved to that file.
    public string? CanonId { get; set; }
    [NotMapped] public string? CanonVersion { get; set; }
    [NotMapped] public bool CanonMissing { get; set; }
}
