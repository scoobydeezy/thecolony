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
        // Title is file-backed (§15): order in memory.
        return Ok((await db.WorldConditions.Where(c => c.CampaignId == cid).ToListAsync()).OrderBy(c => c.SortOrder).ThenBy(c => c.Title));
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
        c.CanonId = null;
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
        var cid = await campaign.GetActiveIdAsync();
        var existing = await db.WorldConditions.FirstOrDefaultAsync(x => x.Id == id && x.CampaignId == cid);
        if (existing is null) return NotFound();
        existing.Title = c.Title;
        existing.Rule = c.Rule;
        existing.RuleOtherwise = c.RuleOtherwise;
        existing.VariesByJson = c.VariesByJson;
        existing.ActiveAtStart = c.ActiveAtStart;
        existing.RequirementsJson = c.RequirementsJson;
        existing.StressContribution = c.StressContribution;
        existing.SortOrder = c.SortOrder;
        c = existing;
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
