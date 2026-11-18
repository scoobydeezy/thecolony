using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ColonyTracker.Api.Controllers;

// Connections are the `leadsTo` lists in the source events' files (NarrativeGraph).
[ApiController]
[Route("api/narrative/connections")]
public class NarrativeConnectionsController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await NarrativeGraph.ConnectionsAsync(db, await campaign.GetActiveIdAsync()));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var connection = (await NarrativeGraph.ConnectionsAsync(db, await campaign.GetActiveIdAsync())).FirstOrDefault(c => c.Id == id);
        return connection is null ? NotFound() : Ok(connection);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] NarrativeEventConnection connection)
    {
        var saved = await NarrativeGraph.AddConnectionAsync(db, await campaign.GetActiveIdAsync(), connection);
        return CreatedAtAction(nameof(GetById), new { id = saved.Id }, saved);
    }

    // The id is derived from source, target and thread, so changing any of them changes the id:
    // the response carries the new one.
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] NarrativeEventConnection connection)
    {
        if (id != connection.Id) return BadRequest();
        var saved = await NarrativeGraph.UpdateConnectionAsync(db, await campaign.GetActiveIdAsync(), id, connection);
        return saved is null ? NotFound() : Ok(saved);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id) =>
        await NarrativeGraph.RemoveConnectionAsync(db, await campaign.GetActiveIdAsync(), id) ? NoContent() : NotFound();
}
