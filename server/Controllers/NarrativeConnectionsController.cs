using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/narrative/connections")]
public class NarrativeConnectionsController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var cid = await campaign.GetActiveIdAsync();
        var connections = await db.NarrativeEventConnections
            .Where(c => c.CampaignId == cid)
            .ToListAsync();
        return Ok(connections);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var connection = await db.NarrativeEventConnections.FindAsync(id);
        if (connection is null) return NotFound();
        return Ok(connection);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] NarrativeEventConnection connection)
    {
        var cid = await campaign.GetActiveIdAsync();
        connection.Id = Guid.NewGuid().ToString();
        connection.CampaignId = cid;
        db.NarrativeEventConnections.Add(connection);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = connection.Id }, connection);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] NarrativeEventConnection connection)
    {
        if (id != connection.Id) return BadRequest();
        var existing = await db.NarrativeEventConnections.FindAsync(id);
        if (existing is null) return NotFound();
        existing.SourceNarrativeEventId = connection.SourceNarrativeEventId;
        existing.TargetNarrativeEventId = connection.TargetNarrativeEventId;
        existing.Label = connection.Label;
        existing.Visibility = connection.Visibility;
        await db.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var connection = await db.NarrativeEventConnections.FindAsync(id);
        if (connection is null) return NotFound();
        db.NarrativeEventConnections.Remove(connection);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
