using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ColonyTracker.Api.Controllers;

// A version's `when` (§14).
[ApiController]
[Route("api/narrative/event-override-paths")]
public class EventOverridePathsController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? overrideId = null) =>
        Ok((await NarrativeBranches.VersionsAsync(db, await campaign.GetActiveIdAsync())).SelectMany(v => v.Paths).Where(p => overrideId is null || p.EventOverrideId == overrideId));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] EventOverridePath op) =>
        await NarrativeBranches.SetVersionPathAsync(db, await campaign.GetActiveIdAsync(), op.EventOverrideId, op.PathId, on: true) ? Ok(op) : Conflict();

    [HttpDelete]
    public async Task<IActionResult> Delete([FromQuery] string overrideId, [FromQuery] string pathId) =>
        await NarrativeBranches.SetVersionPathAsync(db, await campaign.GetActiveIdAsync(), overrideId, pathId, on: false) ? NoContent() : NotFound();
}
