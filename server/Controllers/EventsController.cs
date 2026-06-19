using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/events")]
public class EventsController(AppDbContext db) : ControllerBase
{
    [HttpGet("by-session/{sessionId}")]
    public async Task<IActionResult> GetBySession(string sessionId)
    {
        var events = await db.Events
            .Include(e => e.Effects)
            .Where(e => e.SessionId == sessionId)
            .OrderBy(e => e.SortOrder)
            .ToListAsync();
        return Ok(events);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Event ev)
    {
        ev.Id = Guid.NewGuid().ToString();
        foreach (var ef in ev.Effects)
        {
            ef.Id = Guid.NewGuid().ToString();
            ef.EventId = ev.Id;
        }
        db.Events.Add(ev);
        await db.SaveChangesAsync();

        var loaded = await db.Events
            .Include(e => e.Effects)
            .FirstAsync(e => e.Id == ev.Id);
        return CreatedAtAction(nameof(GetBySession), new { sessionId = ev.SessionId }, loaded);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] Event ev)
    {
        if (id != ev.Id) return BadRequest();

        var existing = await db.Events
            .Include(e => e.Effects)
            .FirstOrDefaultAsync(e => e.Id == id);
        if (existing is null) return NotFound();

        existing.Title = ev.Title;
        existing.Description = ev.Description;
        existing.SortOrder = ev.SortOrder;

        // Replace effects: remove old, add new
        db.EventEffects.RemoveRange(existing.Effects);
        foreach (var ef in ev.Effects)
        {
            ef.Id = Guid.NewGuid().ToString();
            ef.EventId = id;
            db.EventEffects.Add(ef);
        }

        await db.SaveChangesAsync();

        var loaded = await db.Events
            .Include(e => e.Effects)
            .FirstAsync(e => e.Id == id);
        return Ok(loaded);
    }

    [HttpPut("reorder")]
    public async Task<IActionResult> Reorder([FromBody] List<string> orderedIds)
    {
        var events = await db.Events.Where(e => orderedIds.Contains(e.Id)).ToListAsync();
        for (int i = 0; i < orderedIds.Count; i++)
        {
            var ev = events.FirstOrDefault(e => e.Id == orderedIds[i]);
            if (ev is not null) ev.SortOrder = i;
        }
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var ev = await db.Events.FindAsync(id);
        if (ev is null) return NotFound();
        db.Events.Remove(ev);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
