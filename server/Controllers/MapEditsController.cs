using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/map-edits")]
public class MapEditsController(AppDbContext db) : ControllerBase
{
    public record MapEditRequest(
        string SessionId,
        string TargetType,
        string TargetId,
        string Property,
        string? Value,
        string? SecondaryTargetId
    );

    /// <summary>
    /// Upserts a synthetic EventEffect onto the session's invisible MapEdits event.
    /// One effect per (sessionId, targetType, targetId, property) — repeated calls overwrite.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Upsert([FromBody] MapEditRequest req)
    {
        var mapEditsEvent = await db.Events
            .FirstOrDefaultAsync(e => e.SessionId == req.SessionId && e.IsSynthetic);

        if (mapEditsEvent is null)
        {
            mapEditsEvent = new Event
            {
                Id = Guid.NewGuid().ToString(),
                SessionId = req.SessionId,
                Title = "MapEdits",
                IsSynthetic = true,
                SortOrder = 0
            };
            db.Events.Add(mapEditsEvent);
            await db.SaveChangesAsync();
        }

        var existing = await db.EventEffects.FirstOrDefaultAsync(ef =>
            ef.EventId == mapEditsEvent.Id &&
            ef.TargetType == req.TargetType &&
            ef.TargetId == req.TargetId &&
            ef.Property == req.Property);

        if (existing is not null)
        {
            existing.Value = req.Value;
            existing.SecondaryTargetId = req.SecondaryTargetId;
        }
        else
        {
            existing = new EventEffect
            {
                Id = Guid.NewGuid().ToString(),
                EventId = mapEditsEvent.Id,
                TargetType = req.TargetType,
                TargetId = req.TargetId,
                Property = req.Property,
                Value = req.Value,
                SecondaryTargetId = req.SecondaryTargetId
            };
            db.EventEffects.Add(existing);
        }

        await db.SaveChangesAsync();
        return Ok(existing);
    }

    /// <summary>
    /// Deletes a specific synthetic effect (e.g. removing a character from a snapshot location).
    /// </summary>
    [HttpDelete]
    public async Task<IActionResult> Delete(
        [FromQuery] string sessionId,
        [FromQuery] string targetType,
        [FromQuery] string targetId,
        [FromQuery] string property)
    {
        var mapEditsEvent = await db.Events
            .FirstOrDefaultAsync(e => e.SessionId == sessionId && e.IsSynthetic);
        if (mapEditsEvent is null) return NoContent();

        var effect = await db.EventEffects.FirstOrDefaultAsync(ef =>
            ef.EventId == mapEditsEvent.Id &&
            ef.TargetType == targetType &&
            ef.TargetId == targetId &&
            ef.Property == property);

        if (effect is not null)
        {
            db.EventEffects.Remove(effect);
            await db.SaveChangesAsync();
        }

        return NoContent();
    }
}
