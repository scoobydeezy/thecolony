namespace ColonyTracker.Api.Models;

// One of a character's relationships (ADVENTURE-BOOK-PLAN.md §15), stored in that character's file
// (`relationships:`). Not a table: the id is derived from the character, the other character and the type.
public class CharacterRelationship
{
    public string Id { get; set; } = string.Empty;
    public string SourceCharacterId { get; set; } = string.Empty;
    public string? TargetCharacterId { get; set; }
    public string RelationshipType { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public RelationshipState State { get; set; } = RelationshipState.Active;
    public NarrativeVisibility Visibility { get; set; } = NarrativeVisibility.GMOnly;
    public int SortOrder { get; set; } = 0;
}
