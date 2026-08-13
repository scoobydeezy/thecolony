using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/narrative/path-event-scopes")]
public class PathEventScopesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? pathId = null,
        [FromQuery] string? eventId = null)
    {
        var query = db.PathEventScopes.AsQueryable();
        if (pathId is not null)  query = query.Where(s => s.PathId == pathId);
        if (eventId is not null) query = query.Where(s => s.NarrativeEventId == eventId);
        return Ok(await query.ToListAsync());
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PathEventScope scope)
    {
        var exists = await db.PathEventScopes
            .AnyAsync(s => s.PathId == scope.PathId && s.NarrativeEventId == scope.NarrativeEventId);
        if (exists) return Conflict();
        db.PathEventScopes.Add(scope);
        await db.SaveChangesAsync();
        return Ok(scope);
    }

    // Bulk upsert: PUT replaces the full scope list for a given pathId.
    [HttpPut]
    public async Task<IActionResult> BulkReplace(
        [FromQuery] string pathId,
        [FromBody] List<string> eventIds)
    {
        var existing = await db.PathEventScopes
            .Where(s => s.PathId == pathId)
            .ToListAsync();
        db.PathEventScopes.RemoveRange(existing);
        var newScopes = eventIds.Select(eid => new PathEventScope { PathId = pathId, NarrativeEventId = eid });
        db.PathEventScopes.AddRange(newScopes);
        await db.SaveChangesAsync();
        return Ok(newScopes);
    }

    [HttpDelete]
    public async Task<IActionResult> Delete(
        [FromQuery] string pathId,
        [FromQuery] string eventId)
    {
        var existing = await db.PathEventScopes.FindAsync(pathId, eventId);
        if (existing is null) return NotFound();
        db.PathEventScopes.Remove(existing);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
