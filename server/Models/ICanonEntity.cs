namespace ColonyTracker.Api.Models;

// An app entity whose written facts live in a canonical content file (ADVENTURE-BOOK-PLAN.md §9,
// §10): characters, factions, Assets and locations. The row keeps Id, CampaignId, CanonId and play
// data; everything else is read from and saved to the file. Several campaigns may link to one file.
public interface ICanonEntity
{
    string Id { get; }
    string CampaignId { get; }
    // The canonical id of the file, e.g. faction.order-of-theia under adventure/src/content/factions/.
    string? CanonId { get; set; }
    // Version of the file this entity was loaded from. The client sends it back on save; a save is
    // refused if the file changed in between (e.g. edited in VS Code).
    string? CanonVersion { get; set; }
    // True when CanonId points at a file that is missing or unreadable; such an entity can't be saved.
    bool CanonMissing { get; set; }
}
