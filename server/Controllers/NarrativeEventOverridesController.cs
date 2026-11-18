using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ColonyTracker.Api.Controllers;

// An override is one of an event's `variants` (§14); its id comes from the event and the version's key.
[ApiController]
[Route("api/narrative/event-overrides")]
public class NarrativeEventOverridesController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? eventId = null) =>
        Ok((await NarrativeBranches.VersionsAsync(db, await campaign.GetActiveIdAsync())).Select(v => v.Override).Where(o => eventId is null || o.NarrativeEventId == eventId));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id) =>
        (await NarrativeBranches.VersionsAsync(db, await campaign.GetActiveIdAsync())).FirstOrDefault(v => v.Override.Id == id) is { } v ? Ok(v.Override) : NotFound();

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] NarrativeEventOverride o)
    {
        var saved = await NarrativeBranches.AddVersionAsync(db, await campaign.GetActiveIdAsync(), o);
        return CreatedAtAction(nameof(GetById), new { id = saved.Id }, saved);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] NarrativeEventOverride o) =>
        id != o.Id ? BadRequest() : Ok(await NarrativeBranches.UpdateVersionAsync(db, await campaign.GetActiveIdAsync(), id, o));

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        await NarrativeBranches.RemoveVersionAsync(db, await campaign.GetActiveIdAsync(), id);
        return NoContent();
    }
}
