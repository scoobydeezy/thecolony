namespace ColonyTracker.Api.Models;

// Property-level patch on a NarrativeEvent under a specific Path context.
// Which Paths activate this override is stored in EventOverridePath (conjunction).
// Title and NarrativeFunction are invariant across Paths and are not overridable.
// Explicit flags distinguish "intentionally empty" from "inherit".
public class NarrativeEventOverride
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string NarrativeEventId { get; set; } = string.Empty;

    // Scalar overrides. Flag = false means inherit; flag = true means use the value (even if null/empty).
    public bool OverridesSummary { get; set; }
    public string? Summary { get; set; }

    public bool OverridesDescription { get; set; }
    public string? Description { get; set; }

    // Collection override flags.
    // false = inherit the effective value from a less-specific override or the base event.
    // true  = use this override's collection records (even if the collection is empty).
    public bool OverridesConnections { get; set; }
    public bool OverridesAssets { get; set; }
}
