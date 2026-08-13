using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/narrative/event-override-entity-links")]
public class EventOverrideEntityLinksController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? overrideId = null)
    {
        var query = db.EventOverrideEntityLinks.AsQueryable();
        if (overrideId is not null)
            query = query.Where(l => l.EventOverrideId == overrideId);
        return Ok(await query.ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var l = await db.EventOverrideEntityLinks.FindAsync(id);
        if (l is null) return NotFound();
        return Ok(l);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] EventOverrideEntityLink link)
    {
        link.Id = Guid.NewGuid().ToString();
        db.EventOverrideEntityLinks.Add(link);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = link.Id }, link);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] EventOverrideEntityLink link)
    {
        if (id != link.Id) return BadRequest();
        var existing = await db.EventOverrideEntityLinks.FindAsync(id);
        if (existing is null) return NotFound();
        existing.EntityType = link.EntityType;
        existing.EntityId = link.EntityId;
        existing.Role = link.Role;
        existing.IsPrimary = link.IsPrimary;
        existing.Visibility = link.Visibility;
        await db.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var l = await db.EventOverrideEntityLinks.FindAsync(id);
        if (l is null) return NotFound();
        db.EventOverrideEntityLinks.Remove(l);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
