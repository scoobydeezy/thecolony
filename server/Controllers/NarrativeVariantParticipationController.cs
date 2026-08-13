using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/narrative/variant-participation")]
public class NarrativeVariantParticipationController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? eventId = null,
        [FromQuery] string? pathSetId = null)
    {
        var query = db.NarrativeEventVariantParticipations.AsQueryable();
        if (eventId is not null)
            query = query.Where(p => p.NarrativeEventId == eventId);
        if (pathSetId is not null)
            query = query.Where(p => p.PathSetId == pathSetId);
        return Ok(await query.ToListAsync());
    }

    [HttpPut("{eventId}/{pathSetId}")]
    public async Task<IActionResult> Upsert(string eventId, string pathSetId)
    {
        var existing = await db.NarrativeEventVariantParticipations
            .FindAsync(eventId, pathSetId);
        if (existing is not null) return Ok(existing);

        var record = new NarrativeEventVariantParticipation
        {
            NarrativeEventId = eventId,
            PathSetId        = pathSetId,
        };
        db.NarrativeEventVariantParticipations.Add(record);
        await db.SaveChangesAsync();
        return Ok(record);
    }

    [HttpDelete("{eventId}/{pathSetId}")]
    public async Task<IActionResult> Delete(string eventId, string pathSetId)
    {
        var record = await db.NarrativeEventVariantParticipations
            .FindAsync(eventId, pathSetId);
        if (record is null) return NotFound();
        db.NarrativeEventVariantParticipations.Remove(record);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
