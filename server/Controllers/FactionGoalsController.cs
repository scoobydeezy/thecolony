using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/faction-goals")]
public class FactionGoalsController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var cid = await campaign.GetActiveIdAsync();
        return Ok(await db.FactionGoals
            .Where(g => g.CampaignId == cid)
            .OrderBy(g => g.FactionId).ThenBy(g => g.Title)
            .ToListAsync());
    }

    [HttpGet("by-faction/{factionId}")]
    public async Task<IActionResult> GetByFaction(string factionId)
    {
        var cid = await campaign.GetActiveIdAsync();
        return Ok(await db.FactionGoals
            .Where(g => g.CampaignId == cid && g.FactionId == factionId)
            .OrderBy(g => g.Title)
            .ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var goal = await db.FactionGoals.FindAsync(id);
        return goal is null ? NotFound() : Ok(goal);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] FactionGoal goal)
    {
        var cid = await campaign.GetActiveIdAsync();
        goal.Id = Guid.NewGuid().ToString();
        goal.CampaignId = cid;
        db.FactionGoals.Add(goal);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = goal.Id }, goal);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] FactionGoal goal)
    {
        if (id != goal.Id) return BadRequest();
        goal.CampaignId = await campaign.GetActiveIdAsync();
        db.Entry(goal).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return Ok(goal);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var goal = await db.FactionGoals.FindAsync(id);
        if (goal is null) return NotFound();
        db.FactionGoals.Remove(goal);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
