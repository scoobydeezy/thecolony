using ColonyTracker.Api.Data;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

// D11 (M0): scoped to the active campaign like every other controller. Previously this endpoint read the
// "singleton" ColonyState/RulesConfig rows and every campaign's factions and overrides.
[ApiController]
[Route("api/relationships")]
public class RelationshipsController(AppDbContext db, IScoringEngine scoring, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var cid = await campaign.GetActiveIdAsync();
        // Active is file-backed (ADVENTURE-BOOK-PLAN.md §10), so filter after loading.
        var factions = (await db.Factions.Where(f => f.CampaignId == cid).ToListAsync()).Where(f => f.Active).ToList();
        var colonyState = await db.ColonyStates.FirstOrDefaultAsync(s => s.CampaignId == cid);
        var rules = await db.RulesConfigs.FirstOrDefaultAsync(r => r.CampaignId == cid);
        var overrides = await db.RelationshipOverrides.Where(o => o.CampaignId == cid).ToListAsync();

        if (colonyState is null || rules is null) return StatusCode(500, "Colony state or rules not initialized");

        var activeFactions = factions.Where(f => f.Type == Models.GroupType.Faction).ToList();
        var results = new List<object>();

        foreach (var source in activeFactions)
        {
            foreach (var target in activeFactions)
            {
                if (source.Id == target.Id) continue;
                var bump = overrides.FirstOrDefault(o => o.SourceId == source.Id && o.TargetId == target.Id)?.ScoreBump ?? 0;
                var breakdown = scoring.ScoreRelationship(source, target, ScoringEngine.ServerStress, bump, rules);
                results.Add(breakdown);
            }
        }

        // party relationships
        foreach (var faction in activeFactions)
        {
            var bump = overrides.FirstOrDefault(o => o.SourceId == faction.Id && o.TargetId == "party")?.ScoreBump ?? 0;
            var breakdown = scoring.ScoreRelationshipToParty(faction, colonyState, bump, rules);
            results.Add(breakdown);
        }

        return Ok(results);
    }

    [HttpGet("{sourceId}/{targetId}")]
    public async Task<IActionResult> GetOne(string sourceId, string targetId)
    {
        var cid = await campaign.GetActiveIdAsync();
        var colonyState = await db.ColonyStates.FirstOrDefaultAsync(s => s.CampaignId == cid);
        var rules = await db.RulesConfigs.FirstOrDefaultAsync(r => r.CampaignId == cid);
        var bump = (await db.RelationshipOverrides
            .FirstOrDefaultAsync(o => o.CampaignId == cid && o.SourceId == sourceId && o.TargetId == targetId))?.ScoreBump ?? 0;

        if (colonyState is null || rules is null) return StatusCode(500);

        var source = await db.Factions.FirstOrDefaultAsync(f => f.CampaignId == cid && f.Id == sourceId);
        if (source is null) return NotFound();

        if (targetId == "party")
            return Ok(scoring.ScoreRelationshipToParty(source, colonyState, bump, rules));

        var target = await db.Factions.FirstOrDefaultAsync(f => f.CampaignId == cid && f.Id == targetId);
        if (target is null) return NotFound();
        return Ok(scoring.ScoreRelationship(source, target, ScoringEngine.ServerStress, bump, rules));
    }
}
