using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/narrative/event-overrides")]
public class NarrativeEventOverridesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? eventId = null)
    {
        var query = db.NarrativeEventOverrides.AsQueryable();
        if (eventId is not null)
            query = query.Where(o => o.NarrativeEventId == eventId);
        return Ok(await query.ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var o = await db.NarrativeEventOverrides.FindAsync(id);
        if (o is null) return NotFound();
        return Ok(o);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] NarrativeEventOverride o)
    {
        o.Id = Guid.NewGuid().ToString();
        db.NarrativeEventOverrides.Add(o);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = o.Id }, o);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] NarrativeEventOverride o)
    {
        if (id != o.Id) return BadRequest();
        var existing = await db.NarrativeEventOverrides.FindAsync(id);
        if (existing is null) return NotFound();
        existing.OverridesSummary = o.OverridesSummary;
        existing.Summary = o.Summary;
        existing.OverridesDescription = o.OverridesDescription;
        existing.Description = o.Description;
        existing.OverridesConnections = o.OverridesConnections;
        existing.OverridesThreads = o.OverridesThreads;
        existing.OverridesAssets = o.OverridesAssets;
        await db.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var o = await db.NarrativeEventOverrides.FindAsync(id);
        if (o is null) return NotFound();
        db.NarrativeEventOverrides.Remove(o);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
