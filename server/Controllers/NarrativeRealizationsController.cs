using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/narrative/realizations")]
public class NarrativeRealizationsController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? narrativeEventId = null)
    {
        var cid = await campaign.GetActiveIdAsync();

        // Scope by campaign via the narrative event's campaignId
        var eventIds = await db.NarrativeEvents
            .Where(e => e.CampaignId == cid)
            .Select(e => e.Id)
            .ToListAsync();

        var query = db.NarrativeEventRealizations
            .Where(r => eventIds.Contains(r.NarrativeEventId));

        if (narrativeEventId is not null)
            query = query.Where(r => r.NarrativeEventId == narrativeEventId);

        return Ok(await query.ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var r = await db.NarrativeEventRealizations.FindAsync(id);
        if (r is null) return NotFound();
        return Ok(r);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] NarrativeEventRealization realization)
    {
        realization.Id = Guid.NewGuid().ToString();
        db.NarrativeEventRealizations.Add(realization);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = realization.Id }, realization);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] NarrativeEventRealization realization)
    {
        if (id != realization.Id) return BadRequest();
        var existing = await db.NarrativeEventRealizations.FindAsync(id);
        if (existing is null) return NotFound();
        existing.Notes = realization.Notes;
        await db.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var r = await db.NarrativeEventRealizations.FindAsync(id);
        if (r is null) return NotFound();
        db.NarrativeEventRealizations.Remove(r);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
