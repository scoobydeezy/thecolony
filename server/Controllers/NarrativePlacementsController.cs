using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/narrative/placements")]
public class NarrativePlacementsController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var cid = await campaign.GetActiveIdAsync();
        var eventIds = await db.NarrativeEvents
            .Where(e => e.CampaignId == cid)
            .Select(e => e.Id)
            .ToListAsync();
        var placements = await db.NarrativeEventPlacements
            .Where(p => eventIds.Contains(p.NarrativeEventId))
            .ToListAsync();
        return Ok(placements);
    }

    // Bulk upsert: PUT replaces or inserts each placement by NarrativeEventId
    [HttpPut]
    public async Task<IActionResult> BulkUpsert([FromBody] List<NarrativeEventPlacement> placements)
    {
        if (placements is null || placements.Count == 0) return BadRequest();

        var cid = await campaign.GetActiveIdAsync();
        var eventIds = await db.NarrativeEvents
            .Where(e => e.CampaignId == cid)
            .Select(e => e.Id)
            .ToHashSetAsync();

        var ids = placements.Select(p => p.NarrativeEventId).ToList();
        var existing = await db.NarrativeEventPlacements
            .Where(p => ids.Contains(p.NarrativeEventId))
            .ToDictionaryAsync(p => p.NarrativeEventId);

        foreach (var placement in placements)
        {
            if (!eventIds.Contains(placement.NarrativeEventId)) continue;

            if (existing.TryGetValue(placement.NarrativeEventId, out var record))
            {
                record.X = placement.X;
                record.Y = placement.Y;
                record.Width = placement.Width;
                record.Height = placement.Height;
            }
            else
            {
                db.NarrativeEventPlacements.Add(placement);
            }
        }

        await db.SaveChangesAsync();
        return Ok();
    }
}
