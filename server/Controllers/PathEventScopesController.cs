using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ColonyTracker.Api.Controllers;

// An event's `onPaths` (§14).
[ApiController]
[Route("api/narrative/path-event-scopes")]
public class PathEventScopesController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? pathId = null, [FromQuery] string? eventId = null) =>
        Ok((await NarrativeBranches.ScopesAsync(db, await campaign.GetActiveIdAsync()))
            .Where(s => (pathId is null || s.PathId == pathId) && (eventId is null || s.NarrativeEventId == eventId)));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PathEventScope scope) =>
        await NarrativeBranches.SetScopeAsync(db, await campaign.GetActiveIdAsync(), scope.PathId, scope.NarrativeEventId, on: true) ? Ok(scope) : Conflict();

    // Bulk replace: exactly these events are in the path's scope.
    [HttpPut]
    public async Task<IActionResult> BulkReplace([FromQuery] string pathId, [FromBody] List<string> eventIds)
    {
        await NarrativeBranches.ReplaceScopeAsync(db, await campaign.GetActiveIdAsync(), pathId, eventIds);
        return Ok(eventIds.Select(eid => new PathEventScope { PathId = pathId, NarrativeEventId = eid }));
    }

    [HttpDelete]
    public async Task<IActionResult> Delete([FromQuery] string pathId, [FromQuery] string eventId) =>
        await NarrativeBranches.SetScopeAsync(db, await campaign.GetActiveIdAsync(), pathId, eventId, on: false) ? NoContent() : NotFound();
}
