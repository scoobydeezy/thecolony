using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/narrative/path-set-contexts")]
public class PathSetContextsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? pathSetId = null)
    {
        var query = db.PathSetContexts.AsQueryable();
        if (pathSetId is not null)
            query = query.Where(c => c.PathSetId == pathSetId);
        return Ok(await query.ToListAsync());
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PathSetContext ctx)
    {
        var exists = await db.PathSetContexts
            .AnyAsync(c => c.PathSetId == ctx.PathSetId && c.RequiredPathId == ctx.RequiredPathId);
        if (exists) return Conflict();
        db.PathSetContexts.Add(ctx);
        await db.SaveChangesAsync();
        return Ok(ctx);
    }

    [HttpDelete]
    public async Task<IActionResult> Delete(
        [FromQuery] string pathSetId,
        [FromQuery] string requiredPathId)
    {
        var existing = await db.PathSetContexts
            .FindAsync(pathSetId, requiredPathId);
        if (existing is null) return NotFound();
        db.PathSetContexts.Remove(existing);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
