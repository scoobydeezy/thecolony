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
            .Include(e => e.Effects.OrderBy(ef => ef.Ordinal))
            .Where(e => e.SessionId == sessionId)
            .OrderBy(e => e.SortOrder)
            .ToListAsync();
        return Ok(events);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Event ev)
    {
        // Colony Turn events are created only by the Colony Turn procedure (api/colony-turns).
        if (ev.Kind == EventKind.ColonyTurn) return BadRequest("Colony Turn events are created via /api/colony-turns.");
        ev.Id = Guid.NewGuid().ToString();
        var ordinal = 0;
        foreach (var ef in ev.Effects)
        {
            ef.Id = Guid.NewGuid().ToString();
            ef.EventId = ev.Id;
            ef.Origin = EffectOrigin.Manual;   // client-written effects are always Manual
            ef.Ordinal = ordinal++;
        }
        db.Events.Add(ev);
        await db.SaveChangesAsync();

        var loaded = await db.Events
            .Include(e => e.Effects.OrderBy(ef => ef.Ordinal))
            .FirstAsync(e => e.Id == ev.Id);
        return CreatedAtAction(nameof(GetBySession), new { sessionId = ev.SessionId }, loaded);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] Event ev)
    {
        if (id != ev.Id) return BadRequest();

        var existing = await db.Events
            .Include(e => e.Effects.OrderBy(ef => ef.Ordinal))
            .FirstOrDefaultAsync(e => e.Id == id);
        if (existing is null) return NotFound();

        if (existing.Kind == EventKind.ColonyTurn) return Conflict("Colony Turn events are written only by the Colony Turn procedure.");
        existing.Title = ev.Title;
        existing.Description = ev.Description;
        existing.SortOrder = ev.SortOrder;

        // Replace effects: remove old, add new (explicit order = list order)
        db.EventEffects.RemoveRange(existing.Effects);
        var ordinal = 0;
        foreach (var ef in ev.Effects)
        {
            ef.Id = Guid.NewGuid().ToString();
            ef.EventId = id;
            ef.Origin = EffectOrigin.Manual;
            ef.Ordinal = ordinal++;
            db.EventEffects.Add(ef);
        }

        await db.SaveChangesAsync();

        var loaded = await db.Events
            .Include(e => e.Effects.OrderBy(ef => ef.Ordinal))
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
            // M1: a Colony Turn stays the first event of its session.
            if (ev is not null && ev.Kind != EventKind.ColonyTurn) ev.SortOrder = i;
        }
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var ev = await db.Events.FindAsync(id);
        if (ev is null) return NotFound();
        if (ev.Kind == EventKind.ColonyTurn)   // M5: its Effects belong to phases; correct them by voiding the turn
            return Conflict("A Colony Turn event is removed by voiding its Colony Turn, not deleted.");
        db.Events.Remove(ev);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
