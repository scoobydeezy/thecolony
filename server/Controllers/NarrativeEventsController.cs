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
            var linkedIds = (await NarrativeGraph.ConnectionsAsync(db, cid))
                .Where(c => c.ThreadId == threadId)
                .SelectMany(c => new[] { c.SourceNarrativeEventId, c.TargetNarrativeEventId })
                .Distinct()
                .ToList();

            return Ok((await db.NarrativeEvents
                .Where(e => e.CampaignId == cid && linkedIds.Contains(e.Id))
                .ToListAsync()).OrderBy(e => e.Title));
        }

        if (entityType is not null && entityId is not null)
        {
            if (!Enum.TryParse<NarrativeEntityType>(entityType, ignoreCase: true, out var parsedType))
                return BadRequest("Invalid entityType.");

            var linkedIds = (await NarrativeGraph.LinksAsync(db, cid))
                .Where(l => l.OwnerType == NarrativeOwnerType.Event && l.EntityType == parsedType && l.EntityId == entityId)
                .Select(l => l.OwnerId)
                .ToList();

            return Ok((await db.NarrativeEvents
                .Where(e => e.CampaignId == cid && linkedIds.Contains(e.Id))
                .ToListAsync()).OrderBy(e => e.Title));
        }

        // Title is file-backed (not a column): order in memory.
        return Ok((await db.NarrativeEvents
            .Where(e => e.CampaignId == cid)
            .ToListAsync()).OrderBy(e => e.SortOrder).ThenBy(e => e.Title));
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
        if (ev.Kind == NarrativeKind.Event && ev.ParentEventId is not null)
            return BadRequest("Only an encounter can belong to an event.");
        ev.Id = Guid.NewGuid().ToString();
        ev.CampaignId = cid;
        ev.CanonId = null;
        ev.LeadsToJson = null;
        ev.LinksJson = null;
        ev.VariesByJson = null;
        ev.OnPathsJson = null;
        ev.VariantsJson = null;
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
        // The kind is which file (and folder) the item is: chosen when the item is created, never changed here.
        if (existing.Kind == NarrativeKind.Event && ev.ParentEventId is not null)
            return BadRequest("Only an encounter can belong to an event.");
        existing.Title = ev.Title;
        existing.Summary = ev.Summary;
        existing.Description = ev.Description;
        existing.NarrativeFunction = ev.NarrativeFunction;
        existing.Status = ev.Status;
        existing.Visibility = ev.Visibility;
        existing.SortOrder = ev.SortOrder;
        existing.ParentEventId = ev.ParentEventId;
        await db.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var ev = await db.NarrativeEvents.FindAsync(id);
        if (ev is null) return NotFound();
        db.NarrativeEvents.Remove(ev);
        // Its versions, participation and scope are in its file and go with it (§14).
        // Its play links (sessions). Connections and links stored in other files that name this item
        // are left alone and flagged as stale references (§12), never rewritten.
        db.NarrativeEntityLinks.RemoveRange(db.NarrativeEntityLinks.Where(l => l.OwnerType == NarrativeOwnerType.Event && l.OwnerId == id));
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
