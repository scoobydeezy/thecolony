using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/session-log")]
public class SessionLogController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var cid = await campaign.GetActiveIdAsync();
        return Ok(await db.SessionLog
            .Where(s => s.CampaignId == cid)
            .OrderByDescending(s => s.Date)
            .ToListAsync());
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SessionLogEntry entry)
    {
        var cid = await campaign.GetActiveIdAsync();
        entry.Id = Guid.NewGuid().ToString();
        entry.CampaignId = cid;
        db.SessionLog.Add(entry);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), entry);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] SessionLogEntry entry)
    {
        if (id != entry.Id) return BadRequest();
        db.Entry(entry).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return Ok(entry);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var entry = await db.SessionLog.FindAsync(id);
        if (entry is null) return NotFound();
        db.SessionLog.Remove(entry);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
