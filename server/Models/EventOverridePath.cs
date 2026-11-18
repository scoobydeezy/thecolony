namespace ColonyTracker.Api.Models;

// One path a version requires (its `when`). Several form a conjunction. Not a table.
public class EventOverridePath
{
    public string EventOverrideId { get; set; } = string.Empty;
    public string PathId { get; set; } = string.Empty;
}
