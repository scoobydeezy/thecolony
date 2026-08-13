using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/narrative/threads")]
public class NarrativeThreadsController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? entityType = null,
        [FromQuery] string? entityId = null)
    {
        var cid = await campaign.GetActiveIdAsync();

        if (entityType is not null && entityId is not null)
        {
            if (!Enum.TryParse<NarrativeEntityType>(entityType, ignoreCase: true, out var parsedType))
                return BadRequest("Invalid entityType.");

            var linkedIds = await db.NarrativeEntityLinks
                .Where(l => l.CampaignId == cid
                    && l.OwnerType == NarrativeOwnerType.Thread
                    && l.EntityType == parsedType
                    && l.EntityId == entityId)
                .Select(l => l.OwnerId)
                .ToListAsync();

            var threads = await db.NarrativeThreads
                .Where(t => t.CampaignId == cid && linkedIds.Contains(t.Id))
                .OrderBy(t => t.Title)
                .ToListAsync();
            return Ok(threads);
        }

        var all = await db.NarrativeThreads
            .Where(t => t.CampaignId == cid)
            .OrderBy(t => t.Title)
            .ToListAsync();
        return Ok(all);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var thread = await db.NarrativeThreads.FindAsync(id);
        if (thread is null) return NotFound();
        return Ok(thread);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] NarrativeThread thread)
    {
        var cid = await campaign.GetActiveIdAsync();
        thread.Id = Guid.NewGuid().ToString();
        thread.CampaignId = cid;
        db.NarrativeThreads.Add(thread);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = thread.Id }, thread);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] NarrativeThread thread)
    {
        if (id != thread.Id) return BadRequest();
        var existing = await db.NarrativeThreads.FindAsync(id);
        if (existing is null) return NotFound();
        existing.Title   = thread.Title;
        existing.Summary = thread.Summary;
        existing.State   = thread.State;
        await db.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var thread = await db.NarrativeThreads.FindAsync(id);
        if (thread is null) return NotFound();
        db.NarrativeThreads.Remove(thread);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
