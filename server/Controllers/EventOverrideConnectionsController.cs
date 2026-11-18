using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ColonyTracker.Api.Controllers;

// A version's `leadsTo` (§14). The id comes from the version, target and thread, so changing the
// target or thread changes it: the response carries the new one.
[ApiController]
[Route("api/narrative/event-override-connections")]
public class EventOverrideConnectionsController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? overrideId = null) =>
        Ok((await NarrativeBranches.VersionsAsync(db, await campaign.GetActiveIdAsync())).SelectMany(v => v.Connections).Where(c => overrideId is null || c.EventOverrideId == overrideId));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id) =>
        (await NarrativeBranches.VersionsAsync(db, await campaign.GetActiveIdAsync())).SelectMany(v => v.Connections).FirstOrDefault(c => c.Id == id) is { } c ? Ok(c) : NotFound();

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] EventOverrideConnection conn)
    {
        var saved = await NarrativeBranches.AddVersionConnectionAsync(db, await campaign.GetActiveIdAsync(), conn);
        return CreatedAtAction(nameof(GetById), new { id = saved.Id }, saved);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] EventOverrideConnection conn) =>
        id != conn.Id ? BadRequest() : Ok(await NarrativeBranches.UpdateVersionConnectionAsync(db, await campaign.GetActiveIdAsync(), id, conn));

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        await NarrativeBranches.RemoveVersionConnectionAsync(db, await campaign.GetActiveIdAsync(), id);
        return NoContent();
    }
}
