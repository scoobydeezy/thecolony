using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/characters/{characterId}/relationships")]
public class CharacterRelationshipsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(string characterId)
    {
        var relationships = await db.CharacterRelationships
            .Where(r => r.SourceCharacterId == characterId)
            .OrderBy(r => r.SortOrder)
            .ToListAsync();
        return Ok(relationships);
    }

    [HttpPost]
    public async Task<IActionResult> Create(string characterId, [FromBody] CharacterRelationship relationship)
    {
        relationship.Id = Guid.NewGuid().ToString();
        relationship.SourceCharacterId = characterId;
        db.CharacterRelationships.Add(relationship);
        await db.SaveChangesAsync();
        return Ok(relationship);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string characterId, string id, [FromBody] CharacterRelationship relationship)
    {
        if (id != relationship.Id) return BadRequest();
        relationship.SourceCharacterId = characterId;
        db.Entry(relationship).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return Ok(relationship);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string characterId, string id)
    {
        var relationship = await db.CharacterRelationships.FindAsync(id);
        if (relationship is null || relationship.SourceCharacterId != characterId) return NotFound();
        db.CharacterRelationships.Remove(relationship);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
