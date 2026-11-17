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

    // PUT /api/rules                                   (Design campaigns: edit in place; history recomputes)
    // PUT /api/rules?effectiveFromEventId=…&engineVersion=…   (Live campaigns: creates RulesVersion n+1)
    [HttpPut]
    public async Task<IActionResult> Update([FromBody] RulesConfig rules, [FromQuery] string? effectiveFromEventId, [FromQuery] string? engineVersion)
    {
        var cid = await campaign.GetActiveIdAsync();
        rules.CampaignId = cid;
        var camp = await db.Campaigns.FindAsync(cid);
        if (camp?.Mode == CampaignMode.Live)
        {
            if (string.IsNullOrWhiteSpace(effectiveFromEventId))
                return Conflict("Live campaign: rules change only as a new RulesVersion; pass effectiveFromEventId.");
            var ev = await db.Events.AsNoTracking().FirstOrDefaultAsync(e => e.Id == effectiveFromEventId);
            var session = ev is null ? null : await db.Sessions.AsNoTracking().FirstOrDefaultAsync(s => s.Id == ev.SessionId);
            if (session?.CampaignId != cid) return BadRequest("effectiveFromEventId must be an Event in this campaign.");
            var latest = await db.RulesVersions.Where(r => r.CampaignId == cid).OrderByDescending(r => r.Version).FirstOrDefaultAsync();
            db.RulesVersions.Add(new RulesVersion
            {
                CampaignId = cid, Version = (latest?.Version ?? 0) + 1, EffectiveFromEventId = effectiveFromEventId,
                EngineVersion = engineVersion ?? latest?.EngineVersion ?? string.Empty,
                RulesJson = System.Text.Json.JsonSerializer.Serialize(rules),
            });
            db.AllowRulesVersioning = true;
        }
        db.Entry(rules).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return Ok(rules);
    }
}
