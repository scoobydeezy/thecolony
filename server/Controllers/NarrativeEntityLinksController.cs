using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/narrative/entity-links")]
public class NarrativeEntityLinksController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? ownerId = null,
        [FromQuery] string? entityType = null,
        [FromQuery] string? entityId = null)
    {
        var cid = await campaign.GetActiveIdAsync();
        var query = db.NarrativeEntityLinks.Where(l => l.CampaignId == cid);

        if (ownerId is not null)
            query = query.Where(l => l.OwnerId == ownerId);

        if (entityType is not null && entityId is not null)
        {
            if (!Enum.TryParse<NarrativeEntityType>(entityType, ignoreCase: true, out var parsedType))
                return BadRequest("Invalid entityType.");
            query = query.Where(l => l.EntityType == parsedType && l.EntityId == entityId);
        }

        return Ok(await query.ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var link = await db.NarrativeEntityLinks.FindAsync(id);
        if (link is null) return NotFound();
        return Ok(link);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] NarrativeEntityLink link)
    {
        var cid = await campaign.GetActiveIdAsync();
        link.Id = Guid.NewGuid().ToString();
        link.CampaignId = cid;
        db.NarrativeEntityLinks.Add(link);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = link.Id }, link);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] NarrativeEntityLink link)
    {
        if (id != link.Id) return BadRequest();
        var existing = await db.NarrativeEntityLinks.FindAsync(id);
        if (existing is null) return NotFound();
        existing.Role = link.Role;
        existing.Notes = link.Notes;
        existing.IsPrimary = link.IsPrimary;
        existing.Visibility = link.Visibility;
        await db.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var link = await db.NarrativeEntityLinks.FindAsync(id);
        if (link is null) return NotFound();
        db.NarrativeEntityLinks.Remove(link);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
