using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace ColonyTracker.Api.Models;

// ADVENTURE-BOOK-PLAN.md §14: a branch, the canonical file branches/<slug>.yaml (branch.<slug>). It
// declares its paths; events name those paths in their versions. The row keeps Id, CampaignId, CanonId.
public class PathSet : ICanonEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string CampaignId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? OriginEventId { get; set; }
    public string? ConvergenceEventId { get; set; }

    // The file's `paths` ([{id, name}]) and `requires` (path ids), as JSON. Served as NarrativePath and
    // PathSetContext records (NarrativeBranches).
    [JsonIgnore] public string? PathsJson { get; set; }
    [JsonIgnore] public string? RequiresJson { get; set; }

    public string? CanonId { get; set; }
    [NotMapped] public string? CanonVersion { get; set; }
    [NotMapped] public bool CanonMissing { get; set; }
}
