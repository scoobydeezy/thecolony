using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/narrative/event-override-threads")]
public class EventOverrideThreadsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? overrideId = null)
    {
        var query = db.EventOverrideThreads.AsQueryable();
        if (overrideId is not null)
            query = query.Where(t => t.EventOverrideId == overrideId);
        return Ok(await query.ToListAsync());
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] EventOverrideThread ot)
    {
        var exists = await db.EventOverrideThreads
            .AnyAsync(x => x.EventOverrideId == ot.EventOverrideId && x.NarrativeThreadId == ot.NarrativeThreadId);
        if (exists) return Conflict();
        db.EventOverrideThreads.Add(ot);
        await db.SaveChangesAsync();
        return Ok(ot);
    }

    [HttpDelete]
    public async Task<IActionResult> Delete(
        [FromQuery] string overrideId,
        [FromQuery] string threadId)
    {
        var existing = await db.EventOverrideThreads.FindAsync(overrideId, threadId);
        if (existing is null) return NotFound();
        db.EventOverrideThreads.Remove(existing);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
