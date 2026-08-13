namespace ColonyTracker.Api.Models;

// Named NarrativePath to avoid conflict with System.IO.Path.
public class NarrativePath
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string PathSetId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
