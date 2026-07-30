namespace ColonyTracker.Api.Models;

public class CharacterRelationship
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string SourceCharacterId { get; set; } = string.Empty;
    public string? TargetCharacterId { get; set; }
    public string RelationshipType { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public RelationshipState State { get; set; } = RelationshipState.Active;
    public NarrativeVisibility Visibility { get; set; } = NarrativeVisibility.GMOnly;
    public int SortOrder { get; set; } = 0;
}
