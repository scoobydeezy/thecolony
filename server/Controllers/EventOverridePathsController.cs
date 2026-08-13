using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/narrative/event-override-paths")]
public class EventOverridePathsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? overrideId = null)
    {
        var query = db.EventOverridePaths.AsQueryable();
        if (overrideId is not null)
            query = query.Where(op => op.EventOverrideId == overrideId);
        return Ok(await query.ToListAsync());
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] EventOverridePath op)
    {
        var exists = await db.EventOverridePaths
            .AnyAsync(x => x.EventOverrideId == op.EventOverrideId && x.PathId == op.PathId);
        if (exists) return Conflict();
        db.EventOverridePaths.Add(op);
        await db.SaveChangesAsync();
        return Ok(op);
    }

    [HttpDelete]
    public async Task<IActionResult> Delete(
        [FromQuery] string overrideId,
        [FromQuery] string pathId)
    {
        var existing = await db.EventOverridePaths.FindAsync(overrideId, pathId);
        if (existing is null) return NotFound();
        db.EventOverridePaths.Remove(existing);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
