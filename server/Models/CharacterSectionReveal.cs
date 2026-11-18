namespace ColonyTracker.Api.Models;

// Play state for a character's canonical sections: the section with this key has been revealed
// to the players at the table. The section text itself lives in the character's file.
public class CharacterSectionReveal
{
    public string CharacterId { get; set; } = string.Empty;
    public string SectionKey { get; set; } = string.Empty;
}
