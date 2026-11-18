namespace ColonyTracker.Api.Models;

// One path a branch requires (§14: the branch file's `requires`). Several form a conjunction: the
// branch applies only when ALL required paths hold. Not a table.
public class PathSetContext
{
    public string PathSetId { get; set; } = string.Empty;
    public string RequiredPathId { get; set; } = string.Empty;
}
