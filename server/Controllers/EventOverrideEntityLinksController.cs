using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ColonyTracker.Api.Controllers;

// A version's `links` (§14). The id comes from the version and the entity: the response carries it.
[ApiController]
[Route("api/narrative/event-override-entity-links")]
public class EventOverrideEntityLinksController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? overrideId = null) =>
        Ok((await NarrativeBranches.VersionsAsync(db, await campaign.GetActiveIdAsync())).SelectMany(v => v.Links).Where(l => overrideId is null || l.EventOverrideId == overrideId));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id) =>
        (await NarrativeBranches.VersionsAsync(db, await campaign.GetActiveIdAsync())).SelectMany(v => v.Links).FirstOrDefault(l => l.Id == id) is { } l ? Ok(l) : NotFound();

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] EventOverrideEntityLink link)
    {
        var saved = await NarrativeBranches.AddVersionLinkAsync(db, await campaign.GetActiveIdAsync(), link);
        return CreatedAtAction(nameof(GetById), new { id = saved.Id }, saved);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] EventOverrideEntityLink link) =>
        id != link.Id ? BadRequest() : Ok(await NarrativeBranches.UpdateVersionLinkAsync(db, await campaign.GetActiveIdAsync(), id, link));

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        await NarrativeBranches.RemoveVersionLinkAsync(db, await campaign.GetActiveIdAsync(), id);
        return NoContent();
    }
}
