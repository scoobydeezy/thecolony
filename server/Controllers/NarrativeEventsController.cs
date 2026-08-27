using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/narrative/events")]
public class NarrativeEventsController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? threadId = null,
        [FromQuery] string? entityType = null,
        [FromQuery] string? entityId = null)
    {
        var cid = await campaign.GetActiveIdAsync();

        if (threadId is not null)
        {
            var linkedIds = await db.NarrativeEventConnections
                .Where(c => c.CampaignId == cid && c.ThreadId == threadId)
                .SelectMany(c => new[] { c.SourceNarrativeEventId, c.TargetNarrativeEventId })
                .Distinct()
                .ToListAsync();

            return Ok(await db.NarrativeEvents
                .Where(e => e.CampaignId == cid && linkedIds.Contains(e.Id))
                .OrderBy(e => e.Title)
                .ToListAsync());
        }

        if (entityType is not null && entityId is not null)
        {
            if (!Enum.TryParse<NarrativeEntityType>(entityType, ignoreCase: true, out var parsedType))
                return BadRequest("Invalid entityType.");

            var linkedIds = await db.NarrativeEntityLinks
                .Where(l => l.CampaignId == cid
                    && l.OwnerType == NarrativeOwnerType.Event
                    && l.EntityType == parsedType
                    && l.EntityId == entityId)
                .Select(l => l.OwnerId)
                .ToListAsync();

            return Ok(await db.NarrativeEvents
                .Where(e => e.CampaignId == cid && linkedIds.Contains(e.Id))
                .OrderBy(e => e.Title)
                .ToListAsync());
        }

        return Ok(await db.NarrativeEvents
            .Where(e => e.CampaignId == cid)
            .OrderBy(e => e.SortOrder).ThenBy(e => e.Title)
            .ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var ev = await db.NarrativeEvents.FindAsync(id);
        if (ev is null) return NotFound();
        return Ok(ev);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] NarrativeEvent ev)
    {
        var cid = await campaign.GetActiveIdAsync();
        ev.Id = Guid.NewGuid().ToString();
        ev.CampaignId = cid;
        db.NarrativeEvents.Add(ev);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = ev.Id }, ev);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] NarrativeEvent ev)
    {
        if (id != ev.Id) return BadRequest();
        var existing = await db.NarrativeEvents.FindAsync(id);
        if (existing is null) return NotFound();
        existing.Title = ev.Title;
        existing.Summary = ev.Summary;
        existing.Description = ev.Description;
        existing.NarrativeFunction = ev.NarrativeFunction;
        existing.Status = ev.Status;
        existing.Visibility = ev.Visibility;
        existing.SortOrder = ev.SortOrder;
        await db.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var ev = await db.NarrativeEvents.FindAsync(id);
        if (ev is null) return NotFound();
        db.NarrativeEvents.Remove(ev);
        // Cascade: also remove overrides and scopes for this event
        var overrides = db.NarrativeEventOverrides.Where(o => o.NarrativeEventId == id);
        db.NarrativeEventOverrides.RemoveRange(overrides);
        var scopes = db.PathEventScopes.Where(s => s.NarrativeEventId == id);
        db.PathEventScopes.RemoveRange(scopes);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("reorder")]
    public async Task<IActionResult> Reorder([FromBody] List<string> orderedIds)
    {
        var cid = await campaign.GetActiveIdAsync();
        var events = await db.NarrativeEvents
            .Where(e => e.CampaignId == cid && orderedIds.Contains(e.Id))
            .ToListAsync();
        for (int i = 0; i < orderedIds.Count; i++)
        {
            var ev = events.FirstOrDefault(e => e.Id == orderedIds[i]);
            if (ev is not null) ev.SortOrder = i;
        }
        await db.SaveChangesAsync();
        return NoContent();
    }
}
