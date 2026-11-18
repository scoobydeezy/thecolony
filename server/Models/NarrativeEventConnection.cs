namespace ColonyTracker.Api.Models;

// One entry of an event's `leadsTo` list (ADVENTURE-BOOK-PLAN.md §13), stored in the source event's
// file. Not a table: NarrativeGraph builds these from the files, with an id derived from the source,
// target and thread (so it is stable while the entry exists, and the files never hold app ids).
public class NarrativeEventConnection
{
    public string Id { get; set; } = string.Empty;
    public string CampaignId { get; set; } = string.Empty;
    public string SourceNarrativeEventId { get; set; } = string.Empty;
    public string TargetNarrativeEventId { get; set; } = string.Empty;
    public string ThreadId { get; set; } = string.Empty;
    public NarrativeVisibility Visibility { get; set; } = NarrativeVisibility.GMOnly;
}
