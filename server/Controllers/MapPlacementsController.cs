using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/map-placements")]
public class MapPlacementsController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var cid = await campaign.GetActiveIdAsync();
        // Return all placements whose map belongs to the active campaign
        var mapIds = await db.ColonyMaps
            .Where(m => m.CampaignId == cid)
            .Select(m => m.Id)
            .ToListAsync();
        return Ok(await db.MapPlacements
            .Where(p => mapIds.Contains(p.MapId))
            .ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var placement = await db.MapPlacements.FindAsync(id);
        return placement is null ? NotFound() : Ok(placement);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] MapPlacement placement)
    {
        placement.Id = Guid.NewGuid().ToString();
        db.MapPlacements.Add(placement);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = placement.Id }, placement);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] MapPlacement placement)
    {
        if (id != placement.Id) return BadRequest();
        db.Entry(placement).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return Ok(placement);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var placement = await db.MapPlacements.FindAsync(id);
        if (placement is null) return NotFound();
        db.MapPlacements.Remove(placement);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
