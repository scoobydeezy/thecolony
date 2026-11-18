using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace ColonyTracker.Api.Models;

// ADVENTURE-BOOK-PLAN.md §13: a thread is a canonical file (thread.<slug> under
// adventure/src/content/threads/). State is play data and stays in the row.
public class NarrativeThread : ICanonEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string CampaignId { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;
    public string? Summary { get; set; }

    public NarrativeThreadState State { get; set; } = NarrativeThreadState.Open;
    public string? Color { get; set; }

    [JsonIgnore] public string? LinksJson { get; set; }

    public string? CanonId { get; set; }
    [NotMapped] public string? CanonVersion { get; set; }
    [NotMapped] public bool CanonMissing { get; set; }
}
