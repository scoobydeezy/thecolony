using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/colony-state")]
public class ColonyStateController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var cid = await campaign.GetActiveIdAsync();
        var state = await db.ColonyStates.FirstOrDefaultAsync(s => s.CampaignId == cid);
        return state is null ? NotFound() : Ok(state);
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] ColonyState state)
    {
        var cid = await campaign.GetActiveIdAsync();
        state.CampaignId = cid;
        db.Entry(state).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return Ok(state);
    }
}
