using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/factions")]
public class FactionsController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var cid = await campaign.GetActiveIdAsync();
        return Ok(await db.Factions
            .Where(f => f.CampaignId == cid)
            .OrderBy(f => f.SortOrder).ThenBy(f => f.Name)
            .ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var faction = await db.Factions.FindAsync(id);
        return faction is null ? NotFound() : Ok(faction);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Faction faction)
    {
        var cid = await campaign.GetActiveIdAsync();
        faction.Id = Guid.NewGuid().ToString();
        faction.CampaignId = cid;
        if (faction.SortOrder == 0)
            faction.SortOrder = (await db.Factions.Where(f => f.CampaignId == cid).MaxAsync(f => (int?)f.SortOrder) ?? 0) + 1;
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
