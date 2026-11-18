using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using ColonyTracker.Api.Services.Canon;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

// A character's relationships are the `relationships` list in its file (ADVENTURE-BOOK-PLAN.md §15).
// Each is served with an id derived from the character, the other character and the type, so changing
// either of those changes the id: the response carries the new one.
[ApiController]
[Route("api/characters/{characterId}/relationships")]
public class CharacterRelationshipsController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    public static string IdOf(string source, string? target, string type) => NarrativeGraph.IdOf("relationship", source, target ?? "", type);

    private static List<CharacterRelationship> Records(Character c) =>
        CanonCharacterRelations.Parse(c.RelationshipsJson).Select((r, i) => new CharacterRelationship
        {
            Id = IdOf(c.Id, r.To, r.Type), SourceCharacterId = c.Id, TargetCharacterId = r.To, RelationshipType = r.Type,
            Summary = r.Summary, State = r.State, Visibility = r.Visibility, SortOrder = i,
        }).ToList();

    private async Task<Character?> CharacterAsync(string id)
    {
        var cid = await campaign.GetActiveIdAsync();
        return await db.Characters.FirstOrDefaultAsync(c => c.Id == id && c.CampaignId == cid);
    }

    private static CanonCharacterRelations.Item ItemOf(CharacterRelationship r) =>
        new(string.IsNullOrWhiteSpace(r.TargetCharacterId) ? null : r.TargetCharacterId, r.RelationshipType?.Trim() ?? "", string.IsNullOrWhiteSpace(r.Summary) ? null : r.Summary, r.State, r.Visibility);

    private static void Store(Character c, List<CanonCharacterRelations.Item> items)
    {
        if (items.GroupBy(i => (i.To, i.Type)).Any(g => g.Count() > 1)) throw new CanonValidationException("That relationship already exists.");
        c.RelationshipsJson = CanonCharacterRelations.Json(items);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(string characterId) =>
        await CharacterAsync(characterId) is { } c ? Ok(Records(c)) : NotFound();

    [HttpPost]
    public async Task<IActionResult> Create(string characterId, [FromBody] CharacterRelationship relationship)
    {
        if (await CharacterAsync(characterId) is not { } c) return NotFound();
        var items = CanonCharacterRelations.Parse(c.RelationshipsJson);
        items.Insert(Math.Clamp(relationship.SortOrder, 0, items.Count), ItemOf(relationship));
        Store(c, items);
        await db.SaveChangesAsync();
        return Ok(Records(c).First(r => r.Id == IdOf(c.Id, ItemOf(relationship).To, ItemOf(relationship).Type)));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string characterId, string id, [FromBody] CharacterRelationship relationship)
    {
        if (id != relationship.Id) return BadRequest();
        if (await CharacterAsync(characterId) is not { } c) return NotFound();
        var i = Records(c).FindIndex(r => r.Id == id);
        if (i < 0) return NotFound();
        var items = CanonCharacterRelations.Parse(c.RelationshipsJson);
        items.RemoveAt(i);
        items.Insert(Math.Clamp(relationship.SortOrder, 0, items.Count), ItemOf(relationship));
        Store(c, items);
        await db.SaveChangesAsync();
        return Ok(Records(c).First(r => r.Id == IdOf(c.Id, ItemOf(relationship).To, ItemOf(relationship).Type)));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string characterId, string id)
    {
        if (await CharacterAsync(characterId) is not { } c) return NotFound();
        var i = Records(c).FindIndex(r => r.Id == id);
        if (i < 0) return NotFound();
        var items = CanonCharacterRelations.Parse(c.RelationshipsJson);
        items.RemoveAt(i);
        Store(c, items);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
