namespace ColonyTracker.Api.Models;

// One record per Path required to activate an override.
// Multiple records for the same EventOverrideId form a conjunction.
public class EventOverridePath
{
    public string EventOverrideId { get; set; } = string.Empty;
    public string PathId { get; set; } = string.Empty;
}
