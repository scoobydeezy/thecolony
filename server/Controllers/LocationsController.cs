using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/locations")]
public class LocationsController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var cid = await campaign.GetActiveIdAsync();
        // Name is file-backed (ADVENTURE-BOOK-PLAN.md §10), so sort after loading.
        var all = await db.Locations.Where(l => l.CampaignId == cid).ToListAsync();
        return Ok(all.OrderBy(l => l.Name, StringComparer.CurrentCulture).ToList());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var location = await db.Locations.FindAsync(id);
        return location is null ? NotFound() : Ok(location);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Location location)
    {
        var cid = await campaign.GetActiveIdAsync();
        location.Id = await EntityIds.ForCreateAsync(db.Locations, location.Id);   // keep an imported id when it is free
        location.CanonId = null;   // a new entity gets a new canonical file
        location.CampaignId = cid;
        db.Locations.Add(location);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = location.Id }, location);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] Location location)
    {
        if (id != location.Id) return BadRequest();
        // The link to the location's file is the server's, never the request's (ADVENTURE-BOOK-PLAN.md §10).
        var link = await db.Locations.AsNoTracking().Where(x => x.Id == id).Select(x => new { x.CanonId }).FirstOrDefaultAsync();
        if (link is null) return NotFound();
        location.CanonId = link.CanonId;
        location.CampaignId = await campaign.GetActiveIdAsync();
        db.Entry(location).State = EntityState.Modified;

        // Keep linked asset's locationId in sync with this location's parentLocationId.
        if (location.LinkedAssetId is not null)
        {
            var asset = await db.Assets.FindAsync(location.LinkedAssetId);
            if (asset is not null && asset.LocationId != location.ParentLocationId)
            {
                asset.LocationId = location.ParentLocationId;
            }
        }

        await db.SaveChangesAsync();
        return Ok(location);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var location = await db.Locations.FindAsync(id);
        if (location is null) return NotFound();
        db.Locations.Remove(location);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
