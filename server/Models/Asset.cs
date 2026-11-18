using System.ComponentModel.DataAnnotations.Schema;

namespace ColonyTracker.Api.Models;

public class Asset : ICanonEntity
{
    public string Id { get; set; } = "";
    public string CampaignId { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public AssetType Type { get; set; } = AssetType.Infrastructure;
    public AssetRole Role { get; set; } = AssetRole.Operational;
    public int Tier { get; set; } = 3;
    public bool Keystone { get; set; } = false;
    public string? ControllingFactionId { get; set; }
    public string? LocationId { get; set; }
    public AssetStatus Status { get; set; } = AssetStatus.Stable;
    public string? StatusActorFactionId { get; set; }
    // M1: Live campaigns record when an entity enters the world (absent from replay before this Event).
    public string? IntroducedAtEventId { get; set; }

    // ADVENTURE-BOOK-PLAN.md §10: the canonical file (asset.<slug> under adventure/src/content/assets/).
    // Every property in CanonEntityMapping is read from and saved to that file.
    public string? CanonId { get; set; }
    [NotMapped] public string? CanonVersion { get; set; }
    [NotMapped] public bool CanonMissing { get; set; }
}
