using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/assets")]
public class AssetsController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var cid = await campaign.GetActiveIdAsync();
        // Name is file-backed (ADVENTURE-BOOK-PLAN.md §10), so sort after loading.
        var all = await db.Assets.Where(a => a.CampaignId == cid).ToListAsync();
        return Ok(all.OrderBy(a => a.Name, StringComparer.CurrentCulture).ToList());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var asset = await db.Assets.FindAsync(id);
        return asset is null ? NotFound() : Ok(asset);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Asset asset)
    {
        var cid = await campaign.GetActiveIdAsync();
        asset.Id = await EntityIds.ForCreateAsync(db.Assets, asset.Id);   // keep an imported id when it is free
        asset.CanonId = null;   // a new entity gets a new canonical file
        asset.CampaignId = cid;
        db.Assets.Add(asset);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = asset.Id }, asset);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] Asset asset)
    {
        if (id != asset.Id) return BadRequest();
        // The link to the asset's file is the server's, never the request's (ADVENTURE-BOOK-PLAN.md §10).
        var link = await db.Assets.AsNoTracking().Where(x => x.Id == id).Select(x => new { x.CanonId }).FirstOrDefaultAsync();
        if (link is null) return NotFound();
        asset.CanonId = link.CanonId;
        asset.CampaignId = await campaign.GetActiveIdAsync();
        db.Entry(asset).State = EntityState.Modified;

        // Keep linked location's parentLocationId in sync with this asset's locationId.
        // LinkedAssetId is file-backed, so match after loading.
        var linkedLocation = (await db.Locations.Where(l => l.CampaignId == asset.CampaignId).ToListAsync()).FirstOrDefault(l => l.LinkedAssetId == asset.Id);
        if (linkedLocation is not null && linkedLocation.ParentLocationId != asset.LocationId)
        {
            linkedLocation.ParentLocationId = asset.LocationId;
        }

        await db.SaveChangesAsync();
        return Ok(asset);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var asset = await db.Assets.FindAsync(id);
        if (asset is null) return NotFound();
        db.Assets.Remove(asset);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
