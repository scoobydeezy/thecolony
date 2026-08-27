using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/narrative/event-override-connections")]
public class EventOverrideConnectionsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? overrideId = null)
    {
        var query = db.EventOverrideConnections.AsQueryable();
        if (overrideId is not null)
            query = query.Where(c => c.EventOverrideId == overrideId);
        return Ok(await query.ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var c = await db.EventOverrideConnections.FindAsync(id);
        if (c is null) return NotFound();
        return Ok(c);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] EventOverrideConnection conn)
    {
        conn.Id = Guid.NewGuid().ToString();
        db.EventOverrideConnections.Add(conn);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = conn.Id }, conn);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] EventOverrideConnection conn)
    {
        if (id != conn.Id) return BadRequest();
        var existing = await db.EventOverrideConnections.FindAsync(id);
        if (existing is null) return NotFound();
        existing.TargetNarrativeEventId = conn.TargetNarrativeEventId;
        existing.ThreadId = conn.ThreadId;
        existing.Visibility = conn.Visibility;
        await db.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var c = await db.EventOverrideConnections.FindAsync(id);
        if (c is null) return NotFound();
        db.EventOverrideConnections.Remove(c);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
