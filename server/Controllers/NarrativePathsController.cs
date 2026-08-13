using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/narrative/paths")]
public class NarrativePathsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? pathSetId = null)
    {
        var query = db.NarrativePaths.AsQueryable();
        if (pathSetId is not null)
            query = query.Where(p => p.PathSetId == pathSetId);
        return Ok(await query.OrderBy(p => p.SortOrder).ThenBy(p => p.Name).ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var path = await db.NarrativePaths.FindAsync(id);
        if (path is null) return NotFound();
        return Ok(path);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] NarrativePath path)
    {
        path.Id = Guid.NewGuid().ToString();
        db.NarrativePaths.Add(path);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = path.Id }, path);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] NarrativePath path)
    {
        if (id != path.Id) return BadRequest();
        var existing = await db.NarrativePaths.FindAsync(id);
        if (existing is null) return NotFound();
        existing.Name = path.Name;
        existing.SortOrder = path.SortOrder;
        await db.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var path = await db.NarrativePaths.FindAsync(id);
        if (path is null) return NotFound();
        db.NarrativePaths.Remove(path);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
