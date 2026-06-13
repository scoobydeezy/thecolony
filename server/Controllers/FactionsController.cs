using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/factions")]
public class FactionsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await db.Factions.OrderBy(f => f.SortOrder).ThenBy(f => f.Name).ToListAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var faction = await db.Factions.FindAsync(id);
        return faction is null ? NotFound() : Ok(faction);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Faction faction)
    {
        faction.Id = Guid.NewGuid().ToString();
        if (faction.SortOrder == 0)
            faction.SortOrder = (await db.Factions.MaxAsync(f => (int?)f.SortOrder) ?? 0) + 1;
        db.Factions.Add(faction);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = faction.Id }, faction);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] Faction faction)
    {
        if (id != faction.Id) return BadRequest();
        db.Entry(faction).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return Ok(faction);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var faction = await db.Factions.FindAsync(id);
        if (faction is null) return NotFound();
        db.Factions.Remove(faction);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // Accepts an ordered list of faction IDs; assigns SortOrder by position.
    [HttpPut("reorder")]
    public async Task<IActionResult> Reorder([FromBody] List<string> orderedIds)
    {
        var factions = await db.Factions.Where(f => orderedIds.Contains(f.Id)).ToListAsync();
        for (int i = 0; i < orderedIds.Count; i++)
        {
            var f = factions.FirstOrDefault(x => x.Id == orderedIds[i]);
            if (f is not null) f.SortOrder = i;
        }
        await db.SaveChangesAsync();
        return NoContent();
    }
}
