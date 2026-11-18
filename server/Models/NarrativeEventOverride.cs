namespace ColonyTracker.Api.Models;

// A version of an event under some paths (§14: one entry of the event file's `variants`). Not a table:
// its id is derived from the event and the version's `key`. Which paths activate it: EventOverridePath.
// Title and NarrativeFunction are invariant across paths and are not overridable.
// Flags distinguish "intentionally empty" (the field is present in the file) from "inherit" (absent).
public class NarrativeEventOverride
{
    public string Id { get; set; } = string.Empty;
    public string NarrativeEventId { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;

    public bool OverridesSummary { get; set; }
    public string? Summary { get; set; }

    public bool OverridesDescription { get; set; }
    public string? Description { get; set; }

    // true = this version's `leadsTo` / `links` replace the event's (even when empty).
    public bool OverridesConnections { get; set; }
    public bool OverridesAssets { get; set; }
}
