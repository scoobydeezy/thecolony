using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ColonyTracker.Api.Controllers;

// Links to factions, characters, Assets and locations are the owners' `links` lists in their files;
// links to sessions and session events are rows (play data). NarrativeGraph serves both.
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
        var links = (await NarrativeGraph.LinksAsync(db, await campaign.GetActiveIdAsync())).AsEnumerable();
        if (ownerId is not null) links = links.Where(l => l.OwnerId == ownerId);
        if (entityType is not null && entityId is not null)
        {
            if (!Enum.TryParse<NarrativeEntityType>(entityType, ignoreCase: true, out var parsedType))
                return BadRequest("Invalid entityType.");
            links = links.Where(l => l.EntityType == parsedType && l.EntityId == entityId);
        }
        return Ok(links.ToList());
    }

    private async Task<NarrativeEntityLink?> FindAsync(string id) =>
        (await NarrativeGraph.LinksAsync(db, await campaign.GetActiveIdAsync())).FirstOrDefault(l => l.Id == id);

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id) => await FindAsync(id) is { } link ? Ok(link) : NotFound();

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] NarrativeEntityLink link)
    {
        var cid = await campaign.GetActiveIdAsync();
        link.CampaignId = cid;
        if (NarrativeEntityLink.IsAuthored(link.EntityType))
        {
            var saved = await NarrativeGraph.AddLinkAsync(db, cid, link);
            return CreatedAtAction(nameof(GetById), new { id = saved.Id }, saved);
        }
        link.Id = Guid.NewGuid().ToString();
        db.NarrativeEntityLinks.Add(link);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = link.Id }, link);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] NarrativeEntityLink link)
    {
        if (id != link.Id) return BadRequest();
        var existing = await FindAsync(id);
        if (existing is null) return NotFound();
        if (NarrativeEntityLink.IsAuthored(existing.EntityType))
            return await NarrativeGraph.UpdateLinkAsync(db, await campaign.GetActiveIdAsync(), existing, link) is { } saved ? Ok(saved) : NotFound();
        var row = await db.NarrativeEntityLinks.FindAsync(id);
        if (row is null) return NotFound();
        row.Role = link.Role;
        row.Notes = link.Notes;
        row.IsPrimary = link.IsPrimary;
        row.Visibility = link.Visibility;
        await db.SaveChangesAsync();
        return Ok(row);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var existing = await FindAsync(id);
        if (existing is null) return NotFound();
        if (NarrativeEntityLink.IsAuthored(existing.EntityType))
            await NarrativeGraph.RemoveLinkAsync(db, await campaign.GetActiveIdAsync(), existing);
        else
        {
            db.NarrativeEntityLinks.Remove((await db.NarrativeEntityLinks.FindAsync(id))!);
            await db.SaveChangesAsync();
        }
        return NoContent();
    }
}
