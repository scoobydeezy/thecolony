using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/overrides")]
public class OverridesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await db.RelationshipOverrides.ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RelationshipOverride override_)
    {
        override_.Id = Guid.NewGuid().ToString();
        db.RelationshipOverrides.Add(override_);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), override_);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] RelationshipOverride override_)
    {
        if (id != override_.Id) return BadRequest();
        db.Entry(override_).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return Ok(override_);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var o = await db.RelationshipOverrides.FindAsync(id);
        if (o is null) return NotFound();
        db.RelationshipOverrides.Remove(o);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
