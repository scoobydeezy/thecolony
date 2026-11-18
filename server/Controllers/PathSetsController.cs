using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

// A path set is a branch file (ADVENTURE-BOOK-PLAN.md §14); the row is its link.
[ApiController]
[Route("api/narrative/path-sets")]
public class PathSetsController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok((await NarrativeBranches.PathSetsAsync(db, await campaign.GetActiveIdAsync())).OrderBy(s => s.Name));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var cid = await campaign.GetActiveIdAsync();
        var set = await db.PathSets.FirstOrDefaultAsync(s => s.Id == id && s.CampaignId == cid);
        return set is null ? NotFound() : Ok(set);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PathSet pathSet)
    {
        pathSet.Id = Guid.NewGuid().ToString();
        pathSet.CampaignId = await campaign.GetActiveIdAsync();
        pathSet.CanonId = null;
        pathSet.PathsJson = null;
        pathSet.RequiresJson = null;
        db.PathSets.Add(pathSet);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = pathSet.Id }, pathSet);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] PathSet pathSet)
    {
        if (id != pathSet.Id) return BadRequest();
        var cid = await campaign.GetActiveIdAsync();
        var existing = await db.PathSets.FirstOrDefaultAsync(s => s.Id == id && s.CampaignId == cid);
        if (existing is null) return NotFound();
        existing.Name = pathSet.Name;
        existing.OriginEventId = pathSet.OriginEventId;
        existing.ConvergenceEventId = pathSet.ConvergenceEventId;
        await db.SaveChangesAsync();
        return Ok(existing);
    }

    // Deletes the branch file (with its last link). Events that name the branch or its paths keep the
    // references, flagged as stale (§12).
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var cid = await campaign.GetActiveIdAsync();
        var set = await db.PathSets.FirstOrDefaultAsync(s => s.Id == id && s.CampaignId == cid);
        if (set is null) return NotFound();
        db.PathSets.Remove(set);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
