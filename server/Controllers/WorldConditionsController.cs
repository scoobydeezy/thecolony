using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

/// <summary>§18.6 World Conditions: CRUD for the active campaign. Whether one is in force is derived by replay.</summary>
[ApiController]
[Route("api/world-conditions")]
public class WorldConditionsController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var cid = await campaign.GetActiveIdAsync();
        return Ok(await db.WorldConditions.Where(c => c.CampaignId == cid).OrderBy(c => c.SortOrder).ThenBy(c => c.Title).ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var c = await db.WorldConditions.FindAsync(id);
        return c is null ? NotFound() : Ok(c);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] WorldCondition c)
    {
        if (string.IsNullOrWhiteSpace(c.Title)) return BadRequest("title is required.");
        c.Id = await EntityIds.ForCreateAsync(db.WorldConditions, c.Id);   // keep an imported id when it is free
        c.CampaignId = await campaign.GetActiveIdAsync();
        db.WorldConditions.Add(c);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = c.Id }, c);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] WorldCondition c)
    {
        if (id != c.Id) return BadRequest();
        if (string.IsNullOrWhiteSpace(c.Title)) return BadRequest("title is required.");
        if (c.RequirementsJson.Contains($"\"{c.Id}\"")) return BadRequest("a condition cannot depend on itself.");
        c.CampaignId = await campaign.GetActiveIdAsync();
        db.Entry(c).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return Ok(c);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var c = await db.WorldConditions.FindAsync(id);
        if (c is null) return NotFound();
        // a requirement naming a deleted condition never holds (the client says "a removed condition")
        db.WorldConditions.Remove(c);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
