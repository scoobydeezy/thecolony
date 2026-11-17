using System.Text.Json.Serialization;

namespace ColonyTracker.Api.Models;

public class Event
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string SessionId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsSynthetic { get; set; } = false;
    public EventKind Kind { get; set; } = EventKind.Play;
    public ICollection<EventEffect> Effects { get; set; } = new List<EventEffect>();
    [JsonIgnore]
    public Session? Session { get; set; }
}
