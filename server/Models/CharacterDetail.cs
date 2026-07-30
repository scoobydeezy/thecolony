namespace ColonyTracker.Api.Models;

public class CharacterDetail
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string CharacterId { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public string Heading { get; set; } = string.Empty;
    public string? Body { get; set; }
    public int SortOrder { get; set; } = 0;
    public NarrativeVisibility Visibility { get; set; } = NarrativeVisibility.GMOnly;
}
