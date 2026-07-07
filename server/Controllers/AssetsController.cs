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
        return Ok(await db.Assets
            .Where(a => a.CampaignId == cid)
            .OrderBy(a => a.Name)
            .ToListAsync());
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
        asset.Id = Guid.NewGuid().ToString();
        asset.CampaignId = cid;
        db.Assets.Add(asset);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = asset.Id }, asset);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] Asset asset)
    {
        if (id != asset.Id) return BadRequest();
        asset.CampaignId = await campaign.GetActiveIdAsync();
        db.Entry(asset).State = EntityState.Modified;
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
