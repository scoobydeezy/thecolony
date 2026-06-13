using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/session-log")]
public class SessionLogController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await db.SessionLog.OrderByDescending(s => s.Date).ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SessionLogEntry entry)
    {
        entry.Id = Guid.NewGuid().ToString();
        db.SessionLog.Add(entry);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), entry);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] SessionLogEntry entry)
    {
        if (id != entry.Id) return BadRequest();
        db.Entry(entry).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return Ok(entry);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var entry = await db.SessionLog.FindAsync(id);
        if (entry is null) return NotFound();
        db.SessionLog.Remove(entry);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
