using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ColonyTracker.Api.Controllers;

// An event's `variesBy` (§14).
[ApiController]
[Route("api/narrative/variant-participation")]
public class NarrativeVariantParticipationController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? eventId = null, [FromQuery] string? pathSetId = null) =>
        Ok((await NarrativeBranches.ParticipationAsync(db, await campaign.GetActiveIdAsync()))
            .Where(p => (eventId is null || p.NarrativeEventId == eventId) && (pathSetId is null || p.PathSetId == pathSetId)));

    [HttpPut("{eventId}/{pathSetId}")]
    public async Task<IActionResult> Upsert(string eventId, string pathSetId)
    {
        await NarrativeBranches.SetParticipationAsync(db, await campaign.GetActiveIdAsync(), eventId, pathSetId, on: true);
        return Ok(new NarrativeEventVariantParticipation { NarrativeEventId = eventId, PathSetId = pathSetId });
    }

    [HttpDelete("{eventId}/{pathSetId}")]
    public async Task<IActionResult> Delete(string eventId, string pathSetId) =>
        await NarrativeBranches.SetParticipationAsync(db, await campaign.GetActiveIdAsync(), eventId, pathSetId, on: false) ? NoContent() : NotFound();
}
