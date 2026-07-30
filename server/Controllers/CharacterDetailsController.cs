using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/characters/{characterId}/details")]
public class CharacterDetailsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(string characterId)
    {
        var details = await db.CharacterDetails
            .Where(d => d.CharacterId == characterId)
            .OrderBy(d => d.SortOrder)
            .ToListAsync();
        return Ok(details);
    }

    [HttpPost]
    public async Task<IActionResult> Create(string characterId, [FromBody] CharacterDetail detail)
    {
        detail.Id = Guid.NewGuid().ToString();
        detail.CharacterId = characterId;
        db.CharacterDetails.Add(detail);
        await db.SaveChangesAsync();
        return Ok(detail);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string characterId, string id, [FromBody] CharacterDetail detail)
    {
        if (id != detail.Id) return BadRequest();
        detail.CharacterId = characterId;
        db.Entry(detail).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return Ok(detail);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string characterId, string id)
    {
        var detail = await db.CharacterDetails.FindAsync(id);
        if (detail is null || detail.CharacterId != characterId) return NotFound();
        db.CharacterDetails.Remove(detail);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("reorder")]
    public async Task<IActionResult> Reorder(string characterId, [FromBody] List<string> orderedIds)
    {
        var details = await db.CharacterDetails
            .Where(d => d.CharacterId == characterId)
            .ToListAsync();
        for (var i = 0; i < orderedIds.Count; i++)
        {
            var detail = details.FirstOrDefault(d => d.Id == orderedIds[i]);
            if (detail is not null) detail.SortOrder = i;
        }
        await db.SaveChangesAsync();
        return Ok();
    }
}
