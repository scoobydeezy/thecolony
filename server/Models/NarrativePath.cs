namespace ColonyTracker.Api.Models;

// One path of a branch (§14), declared in the branch's file. Not a table: its id is its canonical id
// (path.<slug>), which is also what events' versions name, so no translation is needed.
// Named NarrativePath to avoid conflict with System.IO.Path.
public class NarrativePath
{
    public string Id { get; set; } = string.Empty;
    public string PathSetId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
