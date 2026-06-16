using ColonyTracker.Api.Data;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/relationships")]
public class RelationshipsController(AppDbContext db, IScoringEngine scoring) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var factions = await db.Factions.Where(f => f.Active).ToListAsync();
        var colonyState = await db.ColonyStates.FindAsync("singleton");
        var rules = await db.RulesConfigs.FindAsync("singleton");
        var overrides = await db.RelationshipOverrides.ToListAsync();

        if (colonyState is null || rules is null) return StatusCode(500, "Colony state or rules not initialized");

        var activeFactions = factions.Where(f => f.Type == Models.GroupType.Faction).ToList();
        var results = new List<object>();

        foreach (var source in activeFactions)
        {
            foreach (var target in activeFactions)
            {
                if (source.Id == target.Id) continue;
                var bump = overrides.FirstOrDefault(o => o.SourceId == source.Id && o.TargetId == target.Id)?.ScoreBump ?? 0;
                var breakdown = scoring.ScoreRelationship(source, target, colonyState.ColonyStress, bump, rules);
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
        var colonyState = await db.ColonyStates.FindAsync("singleton");
        var rules = await db.RulesConfigs.FindAsync("singleton");
        var bump = (await db.RelationshipOverrides
            .FirstOrDefaultAsync(o => o.SourceId == sourceId && o.TargetId == targetId))?.ScoreBump ?? 0;

        if (colonyState is null || rules is null) return StatusCode(500);

        if (targetId == "party")
        {
            var source = await db.Factions.FindAsync(sourceId);
            if (source is null) return NotFound();
            return Ok(scoring.ScoreRelationshipToParty(source, colonyState, bump, rules));
        }
        else
        {
            var source = await db.Factions.FindAsync(sourceId);
            var target = await db.Factions.FindAsync(targetId);
            if (source is null || target is null) return NotFound();
            return Ok(scoring.ScoreRelationship(source, target, colonyState.ColonyStress, bump, rules));
        }
    }
}
