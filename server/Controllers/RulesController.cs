using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/rules")]
public class RulesController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var cid = await campaign.GetActiveIdAsync();
        var rules = await db.RulesConfigs.FirstOrDefaultAsync(r => r.CampaignId == cid);
        return rules is null ? NotFound() : Ok(rules);
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] RulesConfig rules)
    {
        var cid = await campaign.GetActiveIdAsync();
        rules.CampaignId = cid;
        db.Entry(rules).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return Ok(rules);
    }
}
