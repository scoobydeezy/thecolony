using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/narrative/path-sets")]
public class PathSetsController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var cid = await campaign.GetActiveIdAsync();
        var sets = await db.PathSets
            .Where(s => s.CampaignId == cid)
            .OrderBy(s => s.Name)
            .ToListAsync();
        return Ok(sets);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var set = await db.PathSets.FindAsync(id);
        if (set is null) return NotFound();
        return Ok(set);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PathSet pathSet)
    {
        var cid = await campaign.GetActiveIdAsync();
        pathSet.Id = Guid.NewGuid().ToString();
        pathSet.CampaignId = cid;
        db.PathSets.Add(pathSet);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = pathSet.Id }, pathSet);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] PathSet pathSet)
    {
        if (id != pathSet.Id) return BadRequest();
        var existing = await db.PathSets.FindAsync(id);
        if (existing is null) return NotFound();
        existing.Name = pathSet.Name;
        existing.OriginEventId = pathSet.OriginEventId;
        existing.ConvergenceEventId = pathSet.ConvergenceEventId;
        await db.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var set = await db.PathSets.FindAsync(id);
        if (set is null) return NotFound();
        db.PathSets.Remove(set);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
