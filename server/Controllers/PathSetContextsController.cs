using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ColonyTracker.Api.Controllers;

// A branch's `requires` (§14).
[ApiController]
[Route("api/narrative/path-set-contexts")]
public class PathSetContextsController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? pathSetId = null) =>
        Ok((await NarrativeBranches.ContextsAsync(db, await campaign.GetActiveIdAsync())).Where(c => pathSetId is null || c.PathSetId == pathSetId));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PathSetContext ctx) =>
        await NarrativeBranches.SetContextAsync(db, await campaign.GetActiveIdAsync(), ctx.PathSetId, ctx.RequiredPathId, on: true) ? Ok(ctx) : Conflict();

    [HttpDelete]
    public async Task<IActionResult> Delete([FromQuery] string pathSetId, [FromQuery] string requiredPathId) =>
        await NarrativeBranches.SetContextAsync(db, await campaign.GetActiveIdAsync(), pathSetId, requiredPathId, on: false) ? NoContent() : NotFound();
}
