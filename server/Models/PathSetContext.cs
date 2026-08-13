namespace ColonyTracker.Api.Models;

// One record per required parent Path. Multiple records for the same PathSet
// form a conjunction — the PathSet is active only when ALL required Paths are selected.
public class PathSetContext
{
    public string PathSetId { get; set; } = string.Empty;
    public string RequiredPathId { get; set; } = string.Empty;
}
