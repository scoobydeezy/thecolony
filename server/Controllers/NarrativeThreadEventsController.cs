using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/narrative/thread-events")]
public class NarrativeThreadEventsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? threadId = null,
        [FromQuery] string? eventId = null)
    {
        var query = db.NarrativeThreadEvents.AsQueryable();
        if (threadId is not null) query = query.Where(te => te.NarrativeThreadId == threadId);
        if (eventId is not null) query = query.Where(te => te.NarrativeEventId == eventId);
        return Ok(await query.ToListAsync());
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] NarrativeThreadEvent threadEvent)
    {
        var exists = await db.NarrativeThreadEvents
            .AnyAsync(te => te.NarrativeThreadId == threadEvent.NarrativeThreadId
                         && te.NarrativeEventId == threadEvent.NarrativeEventId);
        if (exists) return Conflict();
        db.NarrativeThreadEvents.Add(threadEvent);
        await db.SaveChangesAsync();
        return Ok(threadEvent);
    }

    [HttpPut("{threadId}/{eventId}")]
    public async Task<IActionResult> Update(string threadId, string eventId, [FromBody] NarrativeThreadEvent threadEvent)
    {
        var existing = await db.NarrativeThreadEvents
            .FirstOrDefaultAsync(te => te.NarrativeThreadId == threadId && te.NarrativeEventId == eventId);
        if (existing is null) return NotFound();
        existing.IsPrimary = threadEvent.IsPrimary;
        await db.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("{threadId}/{eventId}")]
    public async Task<IActionResult> Delete(string threadId, string eventId)
    {
        var existing = await db.NarrativeThreadEvents
            .FirstOrDefaultAsync(te => te.NarrativeThreadId == threadId && te.NarrativeEventId == eventId);
        if (existing is null) return NotFound();
        db.NarrativeThreadEvents.Remove(existing);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
